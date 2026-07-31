// 업로드된 영수증 사진을 localStorage에 저장하기 적합한 크기로 리사이즈/압축한다.
export function resizeImageFile(
  file: File,
  maxWidth = 900,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('캔버스를 생성할 수 없습니다.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// 차량 사진 등을 실제 File 객체(JPEG)로 압축/변환한다.
// 휴대폰 카메라 원본 파일을 그대로 올리면 확장자/실제 포맷이 안 맞아 깨져 보이는 경우가 있어,
// 캔버스로 다시 그려서 항상 정상적인 JPEG로 저장되도록 한다.
export function compressImageToFile(
  file: File,
  maxWidth = 1600,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        reject(new Error('이미지를 불러올 수 없습니다. (지원하지 않는 사진 형식일 수 있어요)'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('캔버스를 생성할 수 없습니다.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 변환에 실패했습니다.'));
              return;
            }
            const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], newName, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
