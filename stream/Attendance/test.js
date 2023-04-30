const firebase = require('firebase');
require('firebase/firestore');
const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/gmltj/OneDrive/Desktop/Caps_0426/Cap_0427-master/stream/Attendance/capstone-e566b-firebase-adminsdk-ptihx-7000c528a4.json'); // 해당 파일과 같은위치
const schedule = require('node-schedule');
const CronJob = require('cron').CronJob;
const timestamp = firebase.firestore.Timestamp.fromDate(new Date(timestampStr));
// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://capstone-e566b-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

const firestore = admin.firestore();
const realtimeDBRef = admin.database().ref('users');
const db = admin.firestore();

// 매 시간마다 실행되는 함수
async function saveAttendanceHistory() {
    const now = new Date();
  
    // 이전 Attendance 값 가져오기
    const previousAttendanceRef = firestore.collection('attendance').doc('previous');
    const previousAttendanceSnapshot = await previousAttendanceRef.get();
    const previousAttendanceValue = previousAttendanceSnapshot.data().value;
  
    // Firestore에 값 저장
    const attendanceHistoryRef = firestore.collection('attendance_history').doc(now.toISOString());
    await attendanceHistoryRef.set({
      ID: 'some_id',
      Attendance: previousAttendanceValue,
      date: new Date(now).toDateString(),
      start_time: {".sv": "timestamp"}
    });
  
    // Attendance 값 초기화
    await previousAttendanceRef.update({ value: false });
  
    console.log('Attendance history saved at', now);
  }

// 스케쥴러 설정
const rule = new schedule.RecurrenceRule();
rule.minute = 0; // 매 시간 0분에 실행
schedule.scheduleJob(rule, saveAttendanceHistory);

// 실시간 DB에서 Firestore로 데이터 이전
const now = new Date();
const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const midnightInMillis = midnight.getTime();

realtimeDBRef.on('value', (snapshot) => {
    const users = snapshot.val();
    Object.entries(users).forEach(([key, user]) => {
      const { ID, Attendance, start_time } = user;
      let newStart_time = start_time || null; // start_time이 없으면 null로 초기화
      if (Attendance && !start_time) { // Attendance가 true이고 start_time이 없으면 현재 시간 저장
        newStart_time = admin.database.ServerValue.TIMESTAMP; // Firebase 서버의 현재 시간
      } else if (typeof start_time === 'number') { // start_time이 숫자인 경우 JavaScript Date 객체로 변환
        newStart_time = new Date(start_time);
      }
      firestore.collection('users').doc(key).set({
        ID,
        Attendance,
        start_time: newStart_time // start_time 저장
      }, { merge: true })
      .then(() => {
        console.log(`Successfully saved user ${key} to Firestore`);
      })
      .catch((error) => {
        console.error(`Error saving user ${key} to Firestore:`, error);
      });
    });
  });
  
  

// cron 작업 설정 (매 시간마다 결과값 업로드)
const job = new CronJob('0 0 * * * *', updateFirestore);
job.start();

// Firestore에 값을 업데이트하는 함수
function updateFirestore() {
    realtimeDBRef.once('value', (snapshot) => {
        const users = snapshot.val();
        Object.entries(users).forEach(([key, user]) => {
            const { ID, Attendance, start_time } = user;
            firestore.collection('users').doc(key).set({
              ID,
              Attendance,
              start_time // start_time은 이미 Date 객체이므로 변환할 필요 없음
            }, { merge: true })
            .then(() => {
              console.log(`Successfully saved user ${key} to Firestore`);
            })
            .catch((error) => {
              console.error(`Error saving user ${key} to Firestore:`, error);
            });
          });
        });
      }