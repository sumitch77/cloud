

const login = document.getElementById('login');
const dashboard = document.getElementById('dashboard');
const uploadquiz = document.getElementById('uploadquiz');
const viewquiz = document.getElementById('viewquiz');
const maindash = document.getElementById('maindash');
const mainupload = document.getElementById('mainupload');

logout.addEventListener('click', async (e) => {
  e.preventDefault();
  window.location.href= '/logout';
});

window.addEventListener('load',async () => {
  try{
  const response = await fetch('/check' , {
    method: 'GET',
    headers: { 'Content-Type': 'application/json'}
   
  });
  const data = await response.json();
  if(data.login===true){
    login.classList.add('hidden');
  }else{
    login.classList.remove('hidden');
  }
} catch (error) {
  console.error('Error checking sidebar state:', error);
}
});

    // 3. Carousel Horizontal Scroll Controls
    document.querySelectorAll('[data-scroll-controls]').forEach((controls) => {
      const section = controls.closest('section');
      const row = section.querySelector('[data-row]');
      controls.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dir = parseInt(btn.dataset.dir, 10);
          row.scrollBy({ left: dir * 320, behavior: 'smooth' });
        });
      });
    });


uploadquiz.addEventListener('click', () => {
  maindash.classList.add('hidden');
  mainupload.classList.remove('hidden');
  uploadquiz.classList.add('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]', 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');
  viewquiz.classList.remove('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]' , 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');
  dashboard.classList.remove('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]', 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');

});

viewquiz.addEventListener('click', () => {
 viewquiz.classList.add('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]', 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');
  uploadquiz.classList.remove('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]' , 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');
  dashboard.classList.remove('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]', 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');
});

dashboard.addEventListener('click', () => {
  maindash.classList.remove('hidden');
  mainupload.classList.add('hidden');
  dashboard.classList.add('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]', 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');
  uploadquiz.classList.remove('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]', 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');
  viewquiz.classList.remove('bg-[linear-gradient(135deg,var(--primary),var(--secondary))]', 'shadow-[0_0_14px_rgba(155,92,255,0.45)]');

});



