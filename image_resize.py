from PIL import Image
import os

# 원본 이미지가 있는 폴더 경로
raw_folder = 'C:/Users/gmltj/OneDrive/Desktop/hardhat/test/images'
# 크기가 조정된 이미지를 저장할 폴더 경로
resized_folder = 'C:/Users/gmltj/OneDrive/Desktop/hardhat/test/images_resized'
# 원하는 크기
target_size = (416, 416)

# resized_folder가 없으면 폴더를 생성합니다
if not os.path.exists(resized_folder):
    os.makedirs(resized_folder)

# raw 폴더 내의 모든 이미지 파일에 대해 크기를 조정합니다
for filename in os.listdir(raw_folder):
    if filename.endswith('.jpg') or filename.endswith('.png'):
        image_path = os.path.join(raw_folder, filename)
        image = Image.open(image_path)
        resized_image = image.resize(target_size, Image.ANTIALIAS)
        resized_image.save(os.path.join(resized_folder, filename))
