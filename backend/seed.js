const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Class = require("./models/Class");
const Subject = require("./models/Subject");
const Schedule = require("./models/Schedule");
const Grade = require("./models/Grade");
const Assignment = require("./models/Assignment");
const Notification = require("./models/Notification");
const Attendance = require("./models/Attendance");

dotenv.config();
connectDB();

// Clear database
const clearDatabase = async () => {
  await User.deleteMany();
  await Class.deleteMany();
  await Subject.deleteMany();
  await Schedule.deleteMany();
  await Grade.deleteMany();
  await Assignment.deleteMany();
  await Notification.deleteMany();
  await Attendance.deleteMany();
  console.log("✅ Database cleared!");
};

// Seed users
const seedUsers = async () => {
  const adminData = {
    _skipPasswordHashing: true,
    name: "Admin",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
    phone: "0123456789",
    address: "123 Admin Street",
    dateOfBirth: new Date("1990-01-01")
  };
  const admin = await User.create(adminData);

  const teacher1Data = {
    _skipPasswordHashing: true,
    name: "Mr. Smith",
    email: "smith@example.com",
    password: "password123",
    role: "teacher",
    phone: "0123456790",
    address: "456 Teacher Lane",
    dateOfBirth: new Date("1985-05-15"),
    specialization: "Mathematics"
  };
  const teacher1 = await User.create(teacher1Data);

  const teacher2Data = {
    _skipPasswordHashing: true,
    name: "Mrs. Johnson",
    email: "johnson@example.com",
    password: "password123",
    role: "teacher",
    phone: "0123456791",
    address: "789 Teacher Road",
    dateOfBirth: new Date("1988-08-20"),
    specialization: "Physics"
  };
  const teacher2 = await User.create(teacher2Data);

  const studentsData = [
    {
      _skipPasswordHashing: true,
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      role: "student",
      phone: "0123456792",
      address: "321 Student Ave",
      dateOfBirth: new Date("2000-03-10"),
      studentId: "ST001"
    },
    {
      _skipPasswordHashing: true,
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      role: "student",
      phone: "0123456793",
      address: "654 Student Blvd",
      dateOfBirth: new Date("2000-07-22"),
      studentId: "ST002"
    },
    {
      _skipPasswordHashing: true,
      name: "Alice Smith",
      email: "alice@example.com",
      password: "password123",
      role: "student",
      phone: "0123456794",
      address: "987 Student Street",
      dateOfBirth: new Date("2000-12-05"),
      studentId: "ST003"
    }
  ];
  const students = await User.create(studentsData);

  console.log("✅ Users seeded!");
  return { admin, teacher1, teacher2, students };
};

// Seed subjects
const seedSubjects = async ({ admin, teacher1, teacher2 }) => {
  const subjects = await Subject.create([
    {
      name: "Mathematics",
      code: "MATH101",
      description: "Advanced Mathematics Course",
      credits: 3,
      createdBy: admin._id,
      teachers: [teacher1._id]
    },
    {
      name: "Physics",
      code: "PHYS101",
      description: "Physics Fundamentals",
      credits: 3,
      createdBy: admin._id,
      teachers: [teacher2._id]
    },
    {
      name: "Computer Science",
      code: "CS101",
      description: "Introduction to Programming",
      credits: 4,
      createdBy: admin._id,
      teachers: [teacher1._id]
    },
    {
      name: "English",
      code: "ENG101",
      description: "English Language Course",
      credits: 2,
      createdBy: admin._id,
      teachers: [teacher2._id]
    }
  ]);

  console.log("✅ Subjects seeded!");
  return subjects;
};

// Seed classes
const seedClasses = async ({ admin, teacher1, teacher2, students }, subjects) => {
  const classes = await Class.create([
    {
      name: "Class A",
      code: "CLS-A",
      description: "Morning Class",
      subjects: [subjects[0]._id, subjects[1]._id],
      students: students.map(student => student._id),
      teacherId: teacher1._id,
      createdBy: admin._id,
      schedule: [
        {
          startTime: "08:00",
          endTime: "12:00",
          dayOfWeek: 1, // Monday
          subject: subjects[0]._id
        },
        {
          startTime: "08:00",
          endTime: "12:00",
          dayOfWeek: 3, // Wednesday
          subject: subjects[0]._id
        },
        {
          startTime: "08:00",
          endTime: "12:00",
          dayOfWeek: 5, // Friday
          subject: subjects[1]._id
        }
      ]
    },
    {
      name: "Class B",
      code: "CLS-B",
      description: "Afternoon Class",
      subjects: [subjects[2]._id, subjects[3]._id],
      students: students.map(student => student._id),
      teacherId: teacher2._id,
      createdBy: admin._id,
      schedule: [
        {
          startTime: "13:00",
          endTime: "17:00",
          dayOfWeek: 2, // Tuesday
          subject: subjects[2]._id
        },
        {
          startTime: "13:00",
          endTime: "17:00",
          dayOfWeek: 4, // Thursday
          subject: subjects[3]._id
        }
      ]
    }
  ]);

  console.log("✅ Classes seeded!");
  return classes;
};

// Seed schedules
const seedSchedules = async (classes, subjects, { teacher1, teacher2 }) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const scheduleData = [
    {
      classId: classes[0]._id,
      subjectId: subjects[0]._id,
      teacherId: teacher1._id,
      date: today,
      startTime: "08:00",
      endTime: "09:30",
      description: "Mathematics Class",
      room: "Room 101",
      status: "scheduled"
    },
    {
      classId: classes[0]._id,
      subjectId: subjects[1]._id,
      teacherId: teacher2._id,
      date: today,
      startTime: "10:00",
      endTime: "11:30",
      description: "Physics Class",
      room: "Room 102",
      status: "scheduled"
    },
    {
      classId: classes[1]._id,
      subjectId: subjects[2]._id,
      teacherId: teacher1._id,
      date: tomorrow,
      startTime: "13:00",
      endTime: "14:30",
      description: "Computer Science Class",
      room: "Lab 201",
      status: "scheduled"
    },
    {
      classId: classes[1]._id,
      subjectId: subjects[3]._id,
      teacherId: teacher2._id,
      date: tomorrow,
      startTime: "15:00",
      endTime: "16:30",
      description: "English Class",
      room: "Room 103",
      status: "scheduled"
    }
  ];

  const schedules = await Schedule.create(scheduleData);
  console.log("✅ Schedules seeded!");
  return scheduleData;
};

// Seed assignments
const seedAssignments = async (classes, subjects, { teacher1, teacher2 }) => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const assignments = await Assignment.create([
    {
      title: "Mathematics Quiz 1",
      description: "Basic Algebra Quiz",
      classId: classes[0]._id,
      subjectId: subjects[0]._id,
      teacherId: teacher1._id,
      dueDate: nextWeek,
      maxScore: 100,
      type: "quiz",
      totalPoints: 100
    },
    {
      title: "Physics Lab Report",
      description: "Write a report on the pendulum experiment",
      classId: classes[0]._id,
      subjectId: subjects[1]._id,
      teacherId: teacher2._id,
      dueDate: nextWeek,
      maxScore: 100,
      type: "project",
      totalPoints: 100
    }
  ]);

  console.log("✅ Assignments seeded!");
  return assignments;
};

// Seed grades
const seedGrades = async (students, subjects, { teacher1, teacher2 }) => {
  const grades = [];
  
  for (const student of students) {
    for (const subject of subjects) {
      const teacherId = subject.code === "MATH101" || subject.code === "CS101" ? teacher1._id : teacher2._id;
      
      grades.push({
        student: student._id,
        subject: subject._id,
        teacher: teacherId,
        type: "midterm",
        grade: Math.floor(Math.random() * 20) + 80,
        comment: "Good performance in midterm",
        date: new Date(),
        academicTerm: "Spring 2025"
      });

      grades.push({
        student: student._id,
        subject: subject._id,
        teacher: teacherId,
        type: "final",
        grade: Math.floor(Math.random() * 20) + 80,
        comment: "Excellent final exam",
        date: new Date(),
        academicTerm: "Spring 2025"
      });
    }
  }

  await Grade.insertMany(grades);
  console.log("✅ Grades seeded!");
};

// Seed attendance
const seedAttendance = async (schedules, students) => {
  const attendance = [];
  
  for (const schedule of schedules) {
    const attendanceRecords = [];
    for (const student of students) {
      attendanceRecords.push({
        studentId: student._id,
        status: Math.random() > 0.1 ? 'present' : 'absent', // 90% attendance rate
        checkedInAt: schedule.date
      });
    }

    const expiresAt = new Date(schedule.date);
    expiresAt.setHours(expiresAt.getHours() + 1);

    attendance.push({
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      code: Math.random().toString(36).substring(7).toUpperCase(),
      duration: 45, // 45 minutes
      date: schedule.date,
      expiresAt: expiresAt,
      totalStudents: students.length,
      attendances: attendanceRecords,
      allowLate: true,
      isActive: true,
      attendedCount: Math.floor(students.length * 0.9) // 90% attendance rate
    });
  }

  await Attendance.insertMany(attendance);
  console.log("✅ Attendance seeded!");
};

// Seed notifications
const seedNotifications = async (users, classes) => {
  const notifications = [];
  const { students } = users;

  // Create notifications for each student
  for (const student of students) {
    // Class notifications
    for (const cls of classes) {
      notifications.push({
        userId: student._id,
        message: `Welcome to ${cls.name}. The class will start from ${cls.startTime}.`,
        link: `/classes/${cls._id}`,
        isRead: false
      });
    }

    // Assignment notifications
    notifications.push({
      userId: student._id,
      message: 'A new mathematics quiz has been posted. Due next week.',
      link: '/assignments',
      isRead: false
    });
  }

  await Notification.insertMany(notifications);
  console.log("✅ Notifications seeded!");
};

// Main seeding function
const seedDatabase = async () => {
  try {
    await clearDatabase();

    // Seed users first
    const users = await seedUsers();

    // Seed subjects with teacher references
    const subjects = await seedSubjects(users);

    // Seed classes with teacher and student references
    const classes = await seedClasses(users, subjects);

    // Seed schedules with all necessary references
    const schedules = await seedSchedules(classes, subjects, users);

    // Seed assignments
    await seedAssignments(classes, subjects, users);

    // Seed grades
    await seedGrades(users.students, subjects, { teacher1: users.teacher1, teacher2: users.teacher2 });

    // Seed attendance
    await seedAttendance(schedules, users.students);

    // Seed notifications
    await seedNotifications(users, classes);

    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedDatabase();
