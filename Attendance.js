// 최종수정일 : 2023-05-25 03:27 PM
// 필요한 모듈 선언
const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/gmltj/OneDrive/Desktop/Cap_0427-master/stream/Attendance/capstone-e566b-firebase-adminsdk-ptihx-7000c528a4.json'); // 해당 파일과 같은위치
const cron = require('node-cron')
// 초기화 및 DB URL 로드
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://capstone-e566b-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

const firestore = admin.firestore();
const realtimeDBRef = admin.database().ref('/users')
const now = admin.firestore.Timestamp.now();
const midnight = new Date(now.toDate().setHours(0, 0, 0, 0));
const midnightTimestamp = admin.firestore.Timestamp.fromDate(midnight);
const functions = require('firebase-functions');
const moment = require('moment-timezone');

// 컬렉션 제목에 실시간DB 데이터 중 ID를 컬렉션 제목으로 하는 코드 생성(완료)
exports.updateCollections = functions.database.ref('/users/{userId}/ID').onWrite(async (change, context) => {
  const previousId = change.before.val();
  const newId = change.after.val();
  const userId = context.params.userId;

  // Check if ID has changed
  if (previousId === newId) {
    console.log('ID has not changed.');
    return null;
  }

  console.log(`ID for user ${userId} has changed from ${previousId} to ${newId}.`);

  // Firestore collection name is the new ID
  const collectionName = userId;

  // Get reference to ID document in Firestore
  const idDocRef = firestore.collection('IDs').doc(collectionName);

  // Update ID document with new ID value
  await idDocRef.set({ id: newId });

  // Check if collection already exists
  const collectionRef = firestore.collection(collectionName);
  const collectionSnapshot = await collectionRef.get();
  if (!collectionSnapshot.empty) {
    console.log(`Collection '${collectionName}' already exists.`);
    return null;
  }

  // Create new collection
  await collectionRef.doc('initial').set({});

  console.log(`Collection '${collectionName}' has been created.`);

  return null;
});

// Attendance 시간 반영(0509~)
realtimeDBRef.on('value', (snapshot) => {
  const users = snapshot.val();
  if (!users) {
    return;
  }

  const currentDate = moment.tz('Asia/seoul').format('YYYYMMDD');
  Object.entries(users).forEach(([key, user]) => {
    const { ID, Attendance, start_time } = user;
    if (!ID) {
      return; // Skip to the next iteration
    }
    const attendanceRef = firestore.collection('users').doc(ID).collection(currentDate).doc('attendance');
    let newStart_time = start_time || null; // start_time이 없으면 null로 초기화
    if (Attendance && !start_time) { // Attendance가 true이고 start_time이 없으면 현재 시간 저장
      newStart_time = admin.firestore.Timestamp.now();
    } else if (start_time instanceof admin.firestore.Timestamp) { // start_time이 Timestamp 객체인 경우
      newStart_time = start_time;
    } else if (typeof start_time === 'number') { // start_time이 숫자인 경우 Timestamp 객체로 변환
      newStart_time = admin.firestore.Timestamp.fromMillis(start_time);
    }

    if (Attendance && !user.Attendance && newStart_time !== null) { // Attendance 값이 false에서 true가 되었을 때
      attendanceRef.set({
        Attendance_time: newStart_time.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
      }, { merge: true })
      .then(() => {
        console.log(`Successfully saved attendance for user ${ID} to Firestore`);
      })
      .catch((error) => {
        console.error(`Error saving attendance for user ${ID} to Firestore:`, error);
      });
    }

    attendanceRef.set({
      ID,
      Attendance,
      start_time: newStart_time ? newStart_time.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : null // start_time 저장(시간,분,초만 저장)
    }, { merge: true })
    .then(() => {
      console.log(`Successfully saved user ${ID} to Firestore`);
    })
    .catch((error) => {
      console.error(`Error saving user ${ID} to Firestore:`, error);
    });
  });
});


// 최초실행시 실시간DB의 ID키 값 불러오는 함수
async function initializeCollections() {
  // Set Firebase Functions timezone to Asia/Seoul
  const currentTime = moment.tz('Asia/Seoul');
  const idSnapshot = await admin.database().ref('/users').once('value');
  const batch = firestore.batch();
  const currentDate = currentTime.format('YYYYMMDD'); //Get current date in YYYYMMDD format
  console.log(`Initializing collections with document ID: ${currentDate}`); // 추가
  
  idSnapshot.forEach((user) => {
  const userId = user.val().ID;
  if (!userId) {
    return; // Skip to the next iteration
  }

  const userDocRef = firestore.collection('users').doc(userId);
  const collectionRef = userDocRef.collection(currentDate);
  batch.set(collectionRef.doc('attendance'), {});
  });

  await batch.commit();

  console.log('Collections initialized');
  // currentDate = moment().format('YYYYMMDD');

exports.scheduledFunction = functions.pubsub.schedule('0 0 * * *').onRun((context) => {
    initializeCollections();
    return null;
});
}

// node-cron을 이용해서 실시간DB의 Attendance의 값을 false로 초기화시키는 코드(~진행중)
const database = admin.database();

cron.schedule('* * * * *', async () => { // 0 0 * * *로 수정시 매일 자정, * * * * *로 수정시 매 분마다 실행
  try {
    // 사용자 목록 가져오기
    const usersSnapshot = await database.ref('users').once('value');
    
    // 각 사용자의 Attendance 값을 false로 초기화
    usersSnapshot.forEach((userSnapshot) => {
      const attendanceRef = userSnapshot.ref.child('Attendance');
      attendanceRef.set(false);
    });
    
    console.log('Attendance 초기화 완료');
  } catch (error) {
    console.error('Attendance 초기화 오류:', error);
  }
});

// yolov5 객체탐지중 Helmet 클래스가 5초이상 탐지됐을 때 Detect키의 값을 false에서 true로 바꾸는데, 그걸 매 10분마다 초기화하는 코드
cron.schedule('*/10 * * * *', async () => {
  try {
    // /Detect 키의 값을 false로 초기화
    await admin.database().ref('/Detect').set(false);
    
    console.log('Detect 초기화 완료');
  } catch (error) {
    console.error('Detect 초기화 오류:', error);
  }
});

console.log('Cron 작업이 시작되었습니다.');

initializeCollections(); 
// 0510_0108 > 컬렉션(users) - 문서(ID) - 컬렉션2(날짜) - 문서2(attendance) - 필드(Attendance,ID,start_time)순으로 저장 가능 (자정마다 Attendance 값 초기화는 X)
// 0525_1528 : yolov5 객체탐지 중 head 클래스가 5초이상 탐지되면 실시간DB의 detect값이 true로 바뀌는데, Attendance와 유사하게 초기화하는 스케쥴러 구현