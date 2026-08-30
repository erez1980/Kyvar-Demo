const o=new IntersectionObserver(e=>e.forEach(x=>x.isIntersecting&&x.target.classList.add('on')),{threshold:.12});
document.querySelectorAll('.reveal').forEach(x=>o.observe(x));
