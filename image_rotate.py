from PIL import Image
import os

# 회전할 이미지가 있는 폴더 경로
resized_folder = 'C:/Users/gmltj/OneDrive/Desktop/custom/201812404/resized'

# resized 폴더 내의 모든 이미지 파일에 대해 회전을 수행합니다
for filename in os.listdir(resized_folder):
    if filename.endswith('.jpg') or filename.endswith('.png'):
        image_path = os.path.join(resized_folder, filename)
        image = Image.open(image_path)
        rotated_image = image.rotate(-90, expand=True)  # 시계방향으로 90도 회전
        rotated_image.save(image_path)