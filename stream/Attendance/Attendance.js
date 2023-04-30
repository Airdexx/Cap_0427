const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/gmltj/OneDrive/Desktop/Caps_0426/Cap_0427-master/stream/Attendance/capstone-e566b-firebase-adminsdk-ptihx-7000c528a4.json'); // 해당 파일과 같은위치

// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://capstone-e566b.firebaseio.com'
});

const db = admin.firestore();

// 매 시간마다 실행되는 함수
async function saveAttendanceHistory() {
  const now = new Date();

  // 이전 Attendance 값 가져오기
  const previousAttendanceRef = db.collection('attendance').doc('previous');
  const previousAttendanceSnapshot = await previousAttendanceRef.get();
  const previousAttendanceValue = previousAttendanceSnapshot.data().value;

  // Firestore에 값 저장
  const attendanceHistoryRef = db.collection('attendance_history').doc(now.toISOString());
  await attendanceHistoryRef.set({
    id: 'some_id',
    date: now.toDateString(),
    value: previousAttendanceValue
  });

  // Attendance 값 초기화
  await previousAttendanceRef.update({ value: false });

  console.log('Attendance history saved at', now);
}

// 스케쥴러 설정
const schedule = require('node-schedule');
const rule = new schedule.RecurrenceRule();
rule.minute = '*'; // 매 시간 0분에 실행
schedule.scheduleJob(rule, saveAttendanceHistory);
