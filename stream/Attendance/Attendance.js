const admin = require('firebase-admin');
const functions = require('firebase-functions');
admin.initializeApp();

const db = admin.firestore();
const rtdbRef = admin.database().ref('A');

// 매일 자정마다 실행될 함수
exports.resetValueAndSaveToFirestore = functions.pubsub
  .schedule('* * * * *') // 매분실행
  .timeZone('Asia/Seoul') // 원하는 타임존으로 설정
  .onRun(async (context) => {
    const currentDateTime = new Date();
    const currentDateString = currentDateTime.toISOString().substring(0, 10); // yyyy-mm-dd 형태로 변환

    // RTDB의 값을 초기화
    await rtdbRef.set(false);

    // 초기화 이전의 값을 Firestore에 저장
    const usersSnapshot = await db.collection(`${collectionId}/${currentDateString}/users`).get();
    usersSnapshot.forEach(async (docSnapshot) => {
      await db.collection(`${collectionId}/${documentId}/users`).doc(docSnapshot.id).set(docSnapshot.data());
    });

    console.log('Value reset and previous value saved to Firestore successfully.');
  });
