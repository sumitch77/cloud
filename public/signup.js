let name1 = document.getElementById('name1');
let email = document.getElementById('email');
let password = document.getElementById('password');
let confirmpass = document.getElementById('confirmpass');
let signupbtn = document.getElementById('signup');

let ername = document.querySelector('#username-error');
let eremail = document.querySelector('#email-error');
let erpass = document.querySelector('#pass-error');
let erconpass = document.querySelector('#conpass-error');

let eyetoggle = document.querySelector('#eyetoggle');
let eyetoggle2 = document.querySelector('#eyetoggle2');
let eyetoggle3 = document.querySelector('#eyetoggle3');
let message3 = document.getElementById('message3');


let mainlogin = document.querySelector('#mainlogin');
let mainsignup = document.querySelector('#mainsignup');
let msignup = document.querySelector('#msignup');
let mlogin = document.querySelector('#mlogin');
let email2 = document.querySelector('#email2');
let pass2 = document.querySelector('#password2');
let finallogin = document.querySelector('#finallogin');
let message4 = document.querySelector('#message4');
let gotologin = document.querySelector('#gotologin');
let gotosignup = document.querySelector('#gotosignup');
let agreement = document.querySelector('#agreement');
let Gsignup = document.querySelector('#Gsignup');
let Glogin = document.querySelector('#Glogin');

Gsignup.addEventListener('click' , (e)=>{
window.location.href = '/auth/google';
});
Glogin.addEventListener('click' , (e)=>{
window.location.href = '/auth/google';
});

let finalfingerprint;

async function getAudioFingerprint() {
  try {
    const context = new OfflineAudioContext(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = 10000;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);
    const buffer = await context.startRendering();
    const data = buffer.getChannelData(0);
    let fingerprint = 0;
    for (let i = 4000; i < 5000; i++) {
      fingerprint += Math.abs(data[i]);
    }
    return fingerprint.toString();
  } catch (err) {
    console.warn('Audio fingerprint failed:', err);
    return 'audio_error';
  }
}

async function getCanvasFingerprint () {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Hello, world! 🙂 #canvas", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Hello, world! 🙂 #canvas", 4, 17);
    const dataURL = canvas.toDataURL();
    const buffer =  new TextEncoder().encode(dataURL);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = await Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.warn('Canvas fingerprint failed:', err);
    return 'canvas_error';
  }
}

function fontTimingFingerprint() {
  try {
    const fonts = ["Arial", "Helvetica", "Georgia", "Courier New", "Times New Roman", "Verdana", "Impact"];
    const sizes = [12, 24, 48, 72, 96];
    const timings = {};
    fonts.forEach(font => {
      timings[font] = {};
      sizes.forEach(size => {
        const el = document.createElement("span");
        el.style.cssText = `font: ${size}px '${font}'; position: absolute; visibility: hidden;`;
        el.textContent = "mmmwwwiiiIII@#gggjjy";
        document.body.appendChild(el);
        const start = performance.now();
        el.getBoundingClientRect();
        timings[font][size] = performance.now() - start;
        document.body.removeChild(el);
      });
    });
    return JSON.stringify(timings);
  } catch (err) {
    console.warn('Font timing failed:', err);
    return 'font_error';
  }
}

window.fingerprintReady = (async () => {
  try {
    const [canvasFp, audioFp] = await Promise.all([
      getCanvasFingerprint(),
      getAudioFingerprint(),
    ]);
    const allParts = [
      canvasFp,
      audioFp,
      fontTimingFingerprint(),
      navigator.userAgent,
      screen.width + "x" + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency,
      navigator.language,
    ].join("|||");
    finalfingerprint = allParts;
    return finalfingerprint;
  } catch (err) {
    console.error('Error building fingerprint in signup.js:', err);
    finalfingerprint = 'notfound';
    return finalfingerprint;
  }
})();

(async () => {
  try {
    const fp = await Promise.race([
      window.fingerprintReady,
      new Promise(resolve => setTimeout(() => resolve(null), 3000))
    ]);
    if (!fp) {
      finalfingerprint = 'notfound';
    }
    await fetch('/fingerprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: finalfingerprint })
    });
  } catch (err) {
    console.warn('Failed to POST fingerprint from signup.js:', err);
  }
})();
// --- end fingerprint code ---

function toggleForms(showSignup) {
  if (!mainlogin || !mainsignup || !msignup || !mlogin) return;

  mainlogin.classList.toggle('hidden', showSignup);
  mainsignup.classList.toggle('hidden', !showSignup);

  msignup.classList.toggle('bg-[#1967d3]', showSignup);
  msignup.classList.toggle('text-white', showSignup);
  msignup.classList.toggle('bg-transparent', !showSignup);
  msignup.classList.toggle('text-[#9a9a9a]', !showSignup);

  mlogin.classList.toggle('bg-[#1967d3]', !showSignup);
  mlogin.classList.toggle('text-white', !showSignup);
  mlogin.classList.toggle('bg-transparent', showSignup);
  mlogin.classList.toggle('text-[#9a9a9a]', showSignup);
}

if (msignup) {
  msignup.addEventListener('click', () => toggleForms(true));
}
if (mlogin) {
  mlogin.addEventListener('click', () => toggleForms(false));
}
if (gotosignup) {
  gotosignup.addEventListener('click', () => toggleForms(true));
}
if (gotologin) {
  gotologin.addEventListener('click', () => toggleForms(false));
}

toggleForms(true);




function lockButton(button) {
  const originalClasses = button.className;
  button.dataset.originalClasses = originalClasses;

  button.disabled = true;

  button.classList.add(
    'opacity-70',
    'cursor-not-allowed',

    'pointer-events-none',
    'bg-gray-400',
    'text-gray-100'
  );

button.classList.remove(
    'bg-blue-600',
    'hover:bg-blue-700',
    'bg-green-600',
    'hover:bg-green-700',
    'bg-indigo-600',
    'hover:bg-indigo-700',
    'bg-red-600',
    'hover:bg-red-700',
    'text-white'
  );

  setTimeout(() => {
    button.disabled = false;

    button.classList.remove(
      'opacity-70',
      'cursor-not-allowed',
      'pointer-events-none',
      'bg-gray-400',
      'text-gray-100'
    );

    button.className = button.dataset.originalClasses;
  }, 4000);
}



finallogin.addEventListener('click',async(e)=>{
    e.preventDefault();
  lockButton(finallogin);

 
   try {
        const response = await fetch('/login', {
            method: 'POST',
                  headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({email:email2.value , password:pass2.value})
        });
           if(response.status===429){
        const data = await response.json();
         if(!data.success){
        message4.classList.replace('text-green-600' , 'text-red-600');



    }
          message4.innerText = data.message;
        message4.classList.remove('hidden');
        message4.classList.replace('text-green-600' , 'text-red-600');



        setTimeout(()=>{

          message4.innerText="";
         message4.classList.add('hidden');
        message4.classList.replace( 'text-red-600' , 'text-green-600');


        },5000)
       
        return;
       
    }
    if(response.status===400){
        const data = await response.json();
        message4.innerText = data.message;
        message4.classList.remove('hidden');
        message4.classList.replace('text-green-600' , 'text-red-600');



        setTimeout(()=>{

          message4.innerText="";
         message4.classList.add('hidden');
        message4.classList.replace( 'text-red-600' , 'text-green-600');


    },5000);
        return;
    }
        const data = await response.json();
        message4.innerHTML = data.message + (data.link ? `<a href="${data.link}">${' ' + data.actionText}</a>` : '');
        if(!data.success){
                    message4.classList.replace('text-green-600' , 'text-red-600');

        }

                 message4.classList.remove('hidden');
      
     setTimeout(()=>{
    message4.innerText='';

        message4.classList.replace( 'text-red-600' , 'text-green-600');

        message4.classList.add('hidden');

    },5000);
        if (data.success) {
            email2.value = '';
            pass2.value = '';
            
            window.location.href = '/';
        }

    } catch (err) {
        message4.innerText='Unable to connect to server';

       message4.classList.remove('hidden');
        message4.classList.replace('text-green-600' , 'text-red-600');


        setTimeout(()=>{
          message4.innerText='';

          message4.classList.add('hidden');
        message4.classList.replace( 'text-red-600' , 'text-green-600');


    },5000);
    }

});



signupbtn.addEventListener('click', async (e) => {
    e.preventDefault();
    lockButton(signupbtn);
if(!agreement.checked){
    message3.innerText = "Please check Privacy policy and Terms of Use";
        message3.classList.remove('hidden');
        message3.classList.replace('text-green-600' , 'text-red-600');



        setTimeout(()=>{

          message3.innerText="";
         message3.classList.add('hidden');
        message3.classList.replace( 'text-red-600' , 'text-green-600');


        
        },5000)
        return       

}
  const newemail = email.value;
    const payload = {
        name1: name1.value,
        email: newemail,
        password: password.value,
        confirmpass: confirmpass.value,
        agreement: agreement.checked
    };

    try {
        const token = await new Promise((resolve, reject) => {
            grecaptcha.ready(() => {
                grecaptcha.execute('6LdP1VwtAAAAAHvsT_314e0rpmoDW0qvFySxuNmC', { action: 'signup' })
                    .then(resolve)
                    .catch(reject);
            });
        });

        const captchaResponse = await fetch('/captcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: newemail,
                token
            })
        });

        const data2 = await captchaResponse.json();
        if (!data2.success) {
            message3.innerText = data2.message || 'Captcha verification failed. Please try again.';
            message3.classList.remove('hidden');
            message3.classList.replace('text-green-600', 'text-red-600');
            setTimeout(() => {
                message3.innerText = '';
                message3.classList.add('hidden');
                message3.classList.replace('text-red-600', 'text-green-600');
            }, 5000);
            return;
        }

        const response = await fetch('/signupco', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
           if(response.status===429){
        const data = await response.json();
         if(!data.success){
        message3.classList.replace('text-green-600' , 'text-red-600');



    }
          message3.innerText = data.message;
        message3.classList.remove('hidden');
        message3.classList.replace('text-green-600' , 'text-red-600');



        setTimeout(()=>{

          message3.innerText="";
         message3.classList.add('hidden');
        message3.classList.replace( 'text-red-600' , 'text-green-600');


        },5000)
       
        return;
       
    }
    if(response.status===400){
        const data = await response.json();
        message3.innerText = data.message;
        message3.classList.remove('hidden');
        message3.classList.replace('text-green-600' , 'text-red-600');



        setTimeout(()=>{

          message3.innerText="";
         message3.classList.add('hidden');
        message3.classList.replace( 'text-red-600' , 'text-green-600');


    },5000);
        return;
    }
        const data = await response.json();
        message3.innerHTML = data.message + (data.link ? `<a href="${data.link}">${' ' + data.actionText}</a>` : '');

                 message3.classList.remove('hidden');
  
     setTimeout(()=>{
    message3.innerText='';


        message3.classList.add('hidden');

    },5000);

        if (data.success) {
              
            name1.value = '';
            email.value = '';
            password.value = '';
            confirmpass.value = '';
            
            window.location.href = '/';
        }

    } catch (err) {
        message3.innerText='Unable to connect to server';

       message3.classList.remove('hidden');
        message3.classList.replace('text-green-600' , 'text-red-600');


        setTimeout(()=>{
          message3.innerText='';

          message3.classList.add('hidden');
        message3.classList.replace( 'text-red-600' , 'text-green-600');


    },5000);
    }
});


      eyetoggle.addEventListener('click', function(){
        var input = eyetoggle.previousElementSibling;
        input.type = (input.type === 'password') ? 'text' : 'password';
      });
        eyetoggle2.addEventListener('click', function(){
        var input = eyetoggle2.previousElementSibling;
        input.type = (input.type === 'password') ? 'text' : 'password';
      });
   eyetoggle3.addEventListener('click', function(){
        var input = eyetoggle3.previousElementSibling;
        input.type = (input.type === 'password') ? 'text' : 'password';
      });
document.querySelectorAll('.tab').forEach(function(tab){
      tab.addEventListener('click', function(){
        document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
        tab.classList.add('active');
      });
    });




    
name1.addEventListener('input' , (e)=>{
   let currval = e.target.value;
   let flag = "true";

    if(currval.length >20 ) {flag = "false"; }
    else if(currval.length<4) {flag="black";}

    if(flag==="false"){
    name1.classList.remove('border-[#262626]','focus:border-[#1967d3]');
    name1.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    ername.innerText = "Username should be less than 20 characters";

    ername.classList.remove('opacity-0', '-translate-y-1' , 'hidden');
    ername.classList.add('opacity-100', 'translate-y-0');
    }
    else if(flag==="black"){
    name1.classList.remove('border-[#262626]','focus:border-[#1967d3]');
    name1.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    ername.innerText = "Username should be more than 4 characters";

    ername.classList.remove('opacity-0', '-translate-y-1' , 'hidden');
    ername.classList.add('opacity-100', 'translate-y-0');
    }
    else{
        name1.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    name1.classList.add('border-[#262626]', 'focus:border-[#1967d3]');
    ername.innerText="";
    ername.classList.remove('opacity-100', 'translate-y-0');
    ername.classList.add('opacity-0', '-translate-y-1', 'hidden');
    }


});



email.addEventListener('input',(e)=>{
    let currval = e.target.value;
let flag = "true";

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if(!emailRegex.test(currval.trim()))  { flag = "false";  }

     if(flag==="false"){
    email.classList.remove('border-[#262626]','focus:border-[#1967d3]');
    email.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    eremail.innerText = "Email should be Valid";

    eremail.classList.remove('opacity-0', '-translate-y-1' , 'hidden');
    eremail.classList.add('opacity-100', 'translate-y-0');
    }
  else{
        email.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    email.classList.add('border-[#262626]', 'focus:border-[#1967d3]');
    eremail.innerText="";
    eremail.classList.remove('opacity-100', 'translate-y-0');
    eremail.classList.add('opacity-0', '-translate-y-1', 'hidden');
    }

});


password.addEventListener('input',(e)=>{
    let currval = e.target.value;
let flag = "true";
  
if(currval.length<6) {flag = "false"; }
else if(currval.length>20) {flag="black";} 

    
    if(flag==="false"){
    password.classList.remove('border-[#262626]','focus:border-[#1967d3]');
    password.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    erpass.innerText = "Password should be less than 6 characters";

    erpass.classList.remove('opacity-0', '-translate-y-1' , 'hidden');
    erpass.classList.add('opacity-100', 'translate-y-0');
    }
     else if(flag==="black"){
    password.classList.remove('border-[#262626]','focus:border-[#1967d3]');
    password.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    erpass.innerText = "Password should be less than 20 characters";

    erpass.classList.remove('opacity-0', '-translate-y-1' , 'hidden');
    erpass.classList.add('opacity-100', 'translate-y-0');
    }
    else{
        password.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    password.classList.add('border-[#262626]', 'focus:border-[#1967d3]');
    erpass.innerText="";
    erpass.classList.remove('opacity-100', 'translate-y-0');
    erpass.classList.add('opacity-0', '-translate-y-1', 'hidden');
    }

});


confirmpass.addEventListener('input',(e)=>{
let currval = e.target.value;
let flag = "true";

    if(currval!=password.value) { flag = "false"; }
    
    else{ flag="true";}


      if(flag==="false"){
    confirmpass.classList.remove('border-[#262626]','focus:border-[#1967d3]');
    confirmpass.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    erconpass.innerText = "Both Passwords should match";

    erconpass.classList.remove('opacity-0', '-translate-y-1' , 'hidden');
    erconpass.classList.add('opacity-100', 'translate-y-0');
    }
        else{
    confirmpass.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-2', 'focus:ring-red-500/20');
    confirmpass.classList.add('border-[#262626]', 'focus:border-[#1967d3]');
    erconpass.innerText="";
    erconpass.classList.remove('opacity-100', 'translate-y-0');
    erconpass.classList.add('opacity-0', '-translate-y-1', 'hidden');
    }
});
