import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import GradesEntry from './pages/GradesEntry';
import AttendanceRecap from './pages/AttendanceRecap';
import StudentDashboard from './pages/StudentDashboard';
import AdminStudents from './pages/AdminStudents';
import AdminCourses from './pages/AdminCourses';
import AdminGallery from './pages/AdminGallery';
import AdminReports from './pages/AdminReports';
import AdminPayments from './pages/AdminPayments';
import ExamsManage from './pages/ExamsManage';
import ExamResultsRecap from './pages/ExamResultsRecap';
import StudentExams from './pages/StudentExams';
import TakeExam from './pages/TakeExam';
import ExamReview from './pages/ExamReview';
import MyProfile from './pages/MyProfile';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/grades"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <GradesEntry />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance-recap"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <AttendanceRecap />
          </ProtectedRoute>
        }
      />

      <Route
        path="/exams"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <ExamsManage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/exam-results"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <ExamResultsRecap />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student-exams"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentExams />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student-exams/:id"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <TakeExam />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student-exams/results/:attemptId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <ExamReview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <MyProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/students"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminStudents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminCourses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/gallery"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminGallery />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminReports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminPayments />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
