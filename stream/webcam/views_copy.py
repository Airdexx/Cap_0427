# firebase module imported
import time
import firebase_admin
from firebase_admin import db
from firebase_admin import credentials

# yolo and django module imported
from django.shortcuts import render
from django.http import StreamingHttpResponse
import yolov5,torch
from yolov5.utils.general import scale_boxes
from yolov5.utils.general import (check_img_size, non_max_suppression,check_imshow, xyxy2xywh, increment_path)
from yolov5.utils.torch_utils import select_device, time_sync
from yolov5.utils.plots import Annotator, colors
from deep_sort.utils.parser import get_config
from deep_sort.deep_sort import DeepSort
import cv2
from PIL import Image as im

# Create your views here.
def index(request):
    return render(request,'index.html')
print(torch.cuda.is_available())
#load model
model = yolov5.load('C:/Users/gmltj/OneDrive/Desktop/Cap_0427-master/stream/new_hardhat_50.pt')
model.names = ['helmet','head','person','201812404'] # face recognition prototype
# model.names = ['head', 'helmet', 'person'] # helmet & head detection class 
# model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
device = select_device('') # 0 for gpu, '' for cpu
# initialize deepsort
cfg = get_config()
cfg.merge_from_file("deep_sort/configs/deep_sort.yaml")
deepsort = DeepSort('osnet_x0_25',
                    device,
                    max_dist=cfg.DEEPSORT.MAX_DIST,
                    max_iou_distance=cfg.DEEPSORT.MAX_IOU_DISTANCE,
                    max_age=cfg.DEEPSORT.MAX_AGE, n_init=cfg.DEEPSORT.N_INIT, nn_budget=cfg.DEEPSORT.NN_BUDGET,
                    )
# Get names and colors
names = model.module.names if hasattr(model, 'module') else model.names
cred = credentials.Certificate('키 json 파일 위치치')
firebase_admin.initialize_app(cred,{
    'databaseURL' : 'https://capstone-e566b-default-rtdb.asia-southeast1.firebasedatabase.app/'
    })
def stream():
    # Firebase 실시간 데이터베이스 참조
    ref = db.reference('/')

    head_detected_time = None
    head_detected_threshold = 5  # 5초 탐지

    cap = cv2.VideoCapture(0)
    model.conf = 0.5
    model.iou = 0.5
    model.classes = [0, 1, 2, 3]
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: failed to capture image")
            break

        frame = cv2.resize(frame, (480, 480))  # frame adjustments
        results = model(frame, augment=True)  # recall adjusted frame

        # process
        annotator = Annotator(frame, line_width=2, pil=not ascii)
        det = results.pred[0]
        if det is not None and len(det):
            xywhs = xyxy2xywh(det[:, 0:4])
            confs = det[:, 4]
            clss = det[:, 5]
            outputs = deepsort.update(xywhs.cpu(), confs.cpu(), clss.cpu(), frame)
            if len(outputs) > 0:
                for j, (output, conf) in enumerate(zip(outputs, confs)):

                    bboxes = output[0:4]
                    id = output[4]
                    cls = output[5]

                    c = int(cls)  # integer class
                    label = f'{id} {names[c]} {conf:.2f}'
                    annotator.box_label(bboxes, label, color=colors(c, True))

                    # head 클래스를 탐지했을 때
                    if c == 1:
                        # head 클래스가 처음 탐지되었을 때 시간 기록
                        if head_detected_time is None:
                            head_detected_time = time.time()

                        # head 클래스가 head_detected_threshold(5초) 이상 탐지된 경우
                        if time.time() - head_detected_time >= head_detected_threshold:
                            # "Detect" 키의 값을 true로 변경
                            ref.update({'Detect': True})

                    else:
                        # head 클래스를 탐지하지 않았을 때 시간 초기화
                        head_detected_time = None

        else:
            deepsort.increment_ages()

        im0 = annotator.result()
        image_bytes = cv2.imencode('.jpg', im0)[1].tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + image_bytes + b'\r\n')

# def stream(): head 클래스가 탐지되지않아도 실시간DB값이 바뀜
#     # Firebase 실시간 데이터베이스 참조
#     ref = db.reference('/')

#     head_detected_time = None
#     head_detected_threshold = 5  # 5초 이상 탐지 시간 임계값

#     cap = cv2.VideoCapture(0)
#     model.conf = 0.75
#     model.iou = 0.5
#     model.classes = [0, 1, 2]
#     start_time = time.time() # video detection time starts

#     detection_ended = False # Detection ON/OFF 
#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             print("Error: failed to capture image")
#             break

#         frame = cv2.resize(frame, (480, 480))  # frame adjustments
#         results = model(frame, augment=True)  # recall adjusted frame

#         # process
#         annotator = Annotator(frame, line_width=2, pil=not ascii)
#         det = results.pred[0]
#         if det is not None and len(det):
#             xywhs = xyxy2xywh(det[:, 0:4])
#             confs = det[:, 4]
#             clss = det[:, 5]
#             outputs = deepsort.update(xywhs.cpu(), confs.cpu(), clss.cpu(), frame)
#             if len(outputs) > 0:
#                 for j, (output, conf) in enumerate(zip(outputs, confs)):

#                     bboxes = output[0:4]
#                     id = output[4]
#                     cls = output[5]

#                     c = int(cls)  # integer class
#                     label = f'{id} {names[c]} {conf:.2f}'
#                     annotator.box_label(bboxes, label, color=colors(c, True))

#                     # head 클래스를 탐지했을 때
#                     if c == 1:
#                         # head 클래스가 처음 탐지되었을 때 시간 기록
#                         if head_detected_time is None:
#                             head_detected_time = time.time()

#                         # head 클래스가 head_detected_threshold(5초) 이상 탐지된 경우
#                         if time.time() - head_detected_time >= head_detected_threshold:
#                             # "Detect" 키의 값을 true로 변경
#                             ref.update({'Detect': True})
#                             detection_ended = True
#                             break
#                     else:
#                         # head 클래스를 탐지하지 않았을 때 시간 초기화
#                         head_detected_time = None

#         else:
#             deepsort.increment_ages()

#         im0 = annotator.result()
#         image_bytes = cv2.imencode('.jpg', im0)[1].tobytes()
#         yield (b'--frame\r\n'
#                b'Content-Type: image/jpeg\r\n\r\n' + image_bytes + b'\r\n')
#         # Break when detection ends
#         if detection_ended:
#             break

#     cap.release()  

def video_feed(request):
    return StreamingHttpResponse(stream(), content_type='multipart/x-mixed-replace; boundary=frame')
