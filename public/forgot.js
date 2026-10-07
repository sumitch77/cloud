let email = document.getElementById('email');
let sendcode = document.getElementById('sendcode');
let code = document.getElementById('code');
let verbtn = document.getElementById('verbtn');
let newPassword = document.getElementById('newPassword');
let confirmPassword = document.getElementById('confirmPass');
let resetbtn = document.getElementById('resetbtn');
let message = document.getElementById('message');
let warn = document.getElementById('warn');



sendcode.addEventListener('click', async (e) => {
    e.preventDefault();
    const emailValue = email.value.trim();
    try {
    const response = await fetch('/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue })
    });
    if(response.status===429){
        const data = await response.json();
        message.innerText = data.message;
        warn.innerText = message.innerText;
        warn.style.display= 'block';
         setTimeout(()=>{
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
        
    }
    if(response.status===400){
        const data = await response.json();
        message.innerText = data.message;
        warn.innerText = message.innerText;
        warn.style.display= 'block';
         setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
        return;
    }
    const data = await response.json();
    if (data.success) {
        localStorage.setItem('codesent','true');
            sendcode.innerText='Resend';
    localStorage.removeItem('resendUnlock');
        message.innerHTML = data.message || 'Verification code sent to your email.';
        warn.innerText = message.innerText;
        warn.style.display= 'block';
        setTimeout(()=>{
            warn.innerText = message.innerText;
        warn.style.display= 'none';
        },4000)
    } else {
        message.innerHTML = data.message || 'Error sending verification code.';
        warn.innerText = message.innerText;
        warn.style.display= 'block';
         setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
    }
} catch (error) {
    message.innerHTML = 'Unable to connect to server.Try again after few time';
    warn.innerText = message.innerText;
        warn.style.display= 'block';
     setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
}
});

verbtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const emailValue = email.value.trim();
    const codeValue = code.value.trim();
    try {
    const response = await fetch('/forgotverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, code: codeValue })
    });
       if(response.status===429){
        const data = await response.json();
        message.innerText = data.message;
        
        return;
    }
    if(response.status===400){
        const data = await response.json();
        message.innerText = data.message;
        warn.innerText = message.innerText;
        warn.style.display= 'block';
         setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
        return;
    }
    const data = await response.json();
    if (data.success) {
        message.innerHTML = data.message || 'Code verified. You can now reset your password.';
        warn.innerText = message.innerText;
        warn.style.display= 'block';
         setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
    }   
    else {
        message.innerHTML = data.message || 'Invalid code. Please try again.';
        warn.innerText = message.innerText;
        warn.style.display= 'block';
         setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
    }
} catch (error) {
    message.innerHTML = 'Unable to connect to server.Please try again after some time';
    warn.innerText = message.innerText;
        warn.style.display= 'block';
     setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
}
});

resetbtn.addEventListener('click', async (e) => {
e.preventDefault();
     const emailValue = email.value.trim();
    const newPasswordValue = newPassword.value.trim();
    const confirmPasswordValue = confirmPassword.value.trim();
    try {
    const response = await fetch('/resetpassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordValue , confirmPasswordValue: confirmPasswordValue, email: emailValue })
    });
       if(response.status===429){
        const data = await response.json();
        message.innerText = data.message;
        
        return;
    }
    if(response.status===400){
        const data = await response.json();
        message.innerText = data.message;
        warn.innerText = message.innerText;
        warn.style.display= 'block';
         setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
        return;
    }
    const data = await response.json();
    if (data.success) {
    
        message.innerHTML = data.message || 'Password reset successful!';
        warn.innerText = message.innerText;
        warn.style.display= 'block';
        setTimeout(() => {
            window.location.href='/login';
            message.innerText='';
            warn.innerText = message.innerText;
        warn.style.display= 'none';
        }, 1500);
    }
    else {
        message.innerHTML = data.message || 'Error resetting password.';
        warn.innerText = message.innerText;
        warn.style.display= 'block';
         setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
    }
} catch (error) {
    message.innerHTML = 'Unable to connect to server.';
    warn.innerText = message.innerText;
        warn.style.display= 'block';
     setTimeout(()=>{
    message.innerText='';
    warn.innerText = message.innerText;
        warn.style.display= 'none';
    },5000);
}
});