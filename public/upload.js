 const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const previewImg = document.getElementById('previewImg');
  const previewFilename = document.getElementById('previewFilename');
  const changeImageBtn = document.getElementById('changeImageBtn');
  const uploadError = document.getElementById('uploadError');

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  let dragCounter = 0;

  function showError(message){
    uploadError.textContent = message;
    uploadError.classList.add('visible');
  }
  function hideError(){
    uploadError.classList.remove('visible');
  }

  function handleFile(file){
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Please upload a PNG, JPG, JPEG, or WEBP image.');
      fileInput.value = '';
      return;
    }
    hideError();
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewFilename.textContent = file.name;
      uploadArea.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  }

  // click anywhere in the empty box opens the file picker
  uploadArea.addEventListener('click', () => {
    if (!uploadArea.classList.contains('has-image')) {
      fileInput.click();
    }
  });

  // keyboard support
  uploadArea.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === uploadArea) {
      e.preventDefault();
      if (!uploadArea.classList.contains('has-image')) {
        fileInput.click();
      }
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleFile(file);
  });

  changeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // drag & drop
  uploadArea.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    uploadArea.classList.add('drag-over');
  });
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      uploadArea.classList.remove('drag-over');
    }
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });