const User = require("../models/User");
const Class = require("../models/Class");
const Subject = require("../models/Subject");

// Lấy lịch học
exports.getMySchedule = async (req, res) => {
    try {
        const classes = await Class.find({ students: req.user.id })
            .populate('subjects', 'name description')
            .select('name schedule');

        const schedule = classes.reduce((acc, cls) => {
            return acc.concat(
                cls.schedule.map(session => ({
                    className: cls.name,
                    ...session.toObject()
                }))
            );
        }, []);

        res.json(schedule);
    } catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Điểm danh
exports.submitAttendance = async (req, res) => {
    try {
        const { classId, code } = req.body;

        const classDoc = await Class.findOne({ 
            _id: classId,
            students: req.user.id
        });

        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        const attendanceRecord = classDoc.attendanceCodes.find(
            record => record.code === code && record.expiresAt > new Date()
        );

        if (!attendanceRecord) {
            return res.status(400).json({ message: "Invalid or expired attendance code" });
        }

        if (attendanceRecord.attendees.some(a => a.student.equals(req.user.id))) {
            return res.status(400).json({ message: "Attendance already marked" });
        }

        attendanceRecord.attendees.push({
            student: req.user.id,
            attendedAt: new Date()
        });

        await classDoc.save();
        res.json({ message: "Attendance marked successfully" });
    } catch (error) {
        console.error('Submit attendance error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Lấy điểm của student
exports.getMyGrades = async (req, res) => {
    try {
        const subjects = await Subject.find({
            classes: { 
                $in: await Class.find({ 
                    students: req.user.id 
                }).select('_id')
            }
        });

        const grades = subjects.map(subject => {
            const studentGrades = subject.grades.filter(
                grade => grade.student.equals(req.user.id)
            );

            return {
                subject: {
                    _id: subject._id,
                    name: subject.name
                },
                grades: studentGrades,
                finalGrade: subject.calculateFinalGrade(req.user.id)
            };
        });

        res.json(grades);
    } catch (error) {
        console.error('Get grades error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Lấy điểm từ bài tập
exports.getStudentGradesByAssignment = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { classId, subjectId } = req.query;

        const Submission = require('../models/Submission');
        const Assignment = require('../models/Assignment');
        
        const classes = await Class.find({ students: studentId })
            .populate('subjects', 'name description');
        
        if (!classes || classes.length === 0) {
            return res.status(200).json({ assignments: [] });
        }
    
        const assignments = [];

        let subjects = [];
        classes.forEach(cls => {
            if (cls.subjects && cls.subjects.length > 0) {
                if (classId && cls._id.toString() !== classId) {
                    return;
                }               
                cls.subjects.forEach(subject => {
                    if (subjectId && subject._id.toString() !== subjectId) {
                        return;
                    }
                    
                    subjects.push({
                        subject: subject,
                        class: {
                            _id: cls._id,
                            name: cls.name
                        }
                    });
                });
            }
        });
        
        let assignmentsFromDB = [];
        if (subjectId) {  
            const query = { subjectId };
            if (classId) query.classId = classId;
            assignmentsFromDB = await Assignment.find(query);
        } else if (classId) {
            assignmentsFromDB = await Assignment.find({ classId });
        } else {
            const classIds = classes.map(c => c._id);
            assignmentsFromDB = await Assignment.find({ classId: { $in: classIds } });
        }
        
        console.log(`Found ${assignmentsFromDB.length} assignments in database`);
        const submissions = await Submission.find({ studentId });
        console.log(`Found ${submissions.length} submissions for student`);
        for (const assignment of assignmentsFromDB) {
            const submission = submissions.find(
                s => s.assignmentId.toString() === assignment._id.toString()
            );
            
            const classInfo = classes.find(c => c._id.toString() === assignment.classId.toString());
            const subjectInfo = classInfo?.subjects?.find(s => s._id.toString() === assignment.subjectId.toString());
            
            assignments.push({
                _id: assignment._id,
                title: assignment.title,
                description: assignment.description,
                dueDate: assignment.dueDate,
                subject: {
                    _id: assignment.subjectId,
                    name: subjectInfo?.name || 'Unknown Subject'
                },
                class: {
                    _id: assignment.classId,
                    name: classInfo?.name || 'Unknown Class'
                },
                grade: submission?.grade || null,
                comment: submission?.feedback || null,
                submission: submission ? {
                    _id: submission._id,
                    submittedAt: submission.submittedAt,
                    files: submission.files,
                    comment: submission.comment,
                    isLate: submission.isLate
                } : null,
                totalPoints: assignment.totalPoints || 10,
                maxScore: assignment.totalPoints || 10,
                type: assignment.type || 'homework',
                createdAt: assignment.createdAt,
                updatedAt: assignment.updatedAt
            });
        }
        
        for (const item of subjects) {
            const subject = await Subject.findById(item.subject._id);
            
            if (subject && subject.grades && subject.grades.length > 0) {
                const midtermGrade = subject.grades.find(
                    g => g.student.equals(studentId) && g.type === 'midterm'
                );
                
                if (midtermGrade) {
                    assignments.push({
                        _id: `midterm-${subject._id}`,
                        title: 'Giữa kỳ',
                        description: 'Bài kiểm tra giữa kỳ',
                        subject: {
                            _id: subject._id,
                            name: subject.name
                        },
                        class: item.class,
                        grade: midtermGrade.grade,
                        comment: midtermGrade.comment,
                        totalPoints: 10,
                        maxScore: 10,
                        type: 'midterm',
                        createdAt: midtermGrade.createdAt,
                        updatedAt: midtermGrade.updatedAt
                    });
                }
                
                const finalGrade = subject.grades.find(
                    g => g.student.equals(studentId) && g.type === 'final'
                );
                
                if (finalGrade) {
                    assignments.push({
                        _id: `final-${subject._id}`,
                        title: 'Cuối kỳ',
                        description: 'Bài thi cuối kỳ',
                        subject: {
                            _id: subject._id,
                            name: subject.name
                        },
                        class: item.class,
                        grade: finalGrade.grade,
                        comment: finalGrade.comment,
                        totalPoints: 10,
                        maxScore: 10,
                        type: 'final',
                        createdAt: finalGrade.createdAt,
                        updatedAt: finalGrade.updatedAt
                    });
                }
            }
        }
        
        res.status(200).json({ assignments });
    } catch (error) {
        console.error('Error getting student grades by assignment:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Lấy bài tập được giao cho student
exports.getMyAssignments = async (req, res) => {
    try {
        const subjects = await Subject.find({
            classes: { 
                $in: await Class.find({ 
                    students: req.user.id 
                }).select('_id')
            }
        });

        const assignments = subjects.map(subject => ({
            subject: {
                _id: subject._id,
                name: subject.name
            },
            assignments: subject.assignments.map(assignment => {
                const submission = assignment.submissions.find(
                    s => s.student.equals(req.user.id)
                );
                return {
                    _id: assignment._id,
                    title: assignment.title,
                    description: assignment.description,
                    dueDate: assignment.dueDate,
                    submission: submission || null
                };
            })
        }));

        res.json(assignments);
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Gửi bài tập
exports.submitAssignment = async (req, res) => {
    try {
        const { subjectId, assignmentId } = req.params;
        const { content } = req.body;

        const subject = await Subject.findOne({
            _id: subjectId,
            classes: { 
                $in: await Class.find({ 
                    students: req.user.id 
                }).select('_id')
            }
        });

        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        const assignment = subject.assignments.id(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        if (assignment.dueDate < new Date()) {
            return res.status(400).json({ message: "Assignment due date has passed" });
        }

        const existingSubmission = assignment.submissions.find(
            s => s.student.equals(req.user.id)
        );

        if (existingSubmission) {
            existingSubmission.content = content;
            existingSubmission.submittedAt = new Date();
        } else {
            assignment.submissions.push({
                student: req.user.id,
                content,
                submittedAt: new Date()
            });
        }

        await subject.save();
        res.json({ 
            message: "Assignment submitted successfully",
            submission: existingSubmission || 
                assignment.submissions[assignment.submissions.length - 1]
        });
    } catch (error) {
        console.error('Submit assignment error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = exports;
