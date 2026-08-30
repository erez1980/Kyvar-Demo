// Applies the visitor's stored theme choice before first paint
try{var t=localStorage.getItem('kyvar-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}
