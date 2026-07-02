let currentLang = localStorage.getItem('lang') || 'ru';
let siteData = {};

const fetchContent = async () => {
    try {
        const response = await fetch('/api/content');
        siteData = await response.json();
        renderPage();
    } catch (err) {
        console.error('Error fetching content:', err);
    }
}

const setLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    renderPage();
}

const renderPage = () => {
    const langData = siteData[currentLang];
    if (!langData) return;

    // Logo & Contacts
    document.getElementById('main-logo').src = siteData.logo || 'https://via.placeholder.com/150x50?text=ObedTime';
    document.getElementById('info-address').textContent = siteData.address;
    document.getElementById('info-phone').textContent = siteData.phone;
    document.getElementById('info-phone').href = `tel:${siteData.phone.replace(/\s/g, '')}`;
    document.getElementById('info-email').textContent = siteData.email;
    document.getElementById('info-hours').textContent = siteData.hours;
    document.getElementById('map-iframe').src = siteData.mapUrl;

    // Nav
    const navLinks = document.getElementById('nav-links');
    const ids = ['#home', '#about', '#services', '#location', '#contact'];
    navLinks.innerHTML = langData.nav.map((text, i) => `<li><a href="${ids[i]}">${text}</a></li>`).join('');

    // Hero
    document.getElementById('hero-title').textContent = langData.hero.title;
    document.getElementById('hero-desc').textContent = langData.hero.description;
    document.getElementById('hero-btn').textContent = langData.contact.submit;

    // About
    document.getElementById('about-title').textContent = langData.about.title;
    document.getElementById('about-text1').textContent = langData.about.text1;
    document.getElementById('about-text2').textContent = langData.about.text2;

    // Stats
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = langData.stats.map(stat => `
        <div class="stat-item">
            <h3>${stat.value}</h3>
            <p>${stat.label}</p>
        </div>
    `).join('');

    // Services
    document.getElementById('services-title').textContent = langData.nav[2];
    const servicesGrid = document.getElementById('services-grid');
    servicesGrid.innerHTML = langData.services.map(service => `
        <div class="service-card">
            <div class="icon">${service.icon}</div>
            <h3>${service.title}</h3>
            <p>${service.description}</p>
        </div>
    `).join('');

    // Dishes (Menu)
    document.getElementById('menu-title').textContent = langData.dishesTitle || '';
    const dishesGrid = document.getElementById('dishes-grid');
    if (langData.dishes) {
        dishesGrid.innerHTML = langData.dishes.map(dish => `
            <div class="dish-card">
                <img src="${dish.img}" alt="${dish.name}">
                <div class="dish-info">
                    <h3>${dish.name}</h3>
                    <p>${dish.desc}</p>
                </div>
            </div>
        `).join('');
    }

    // Location
    document.getElementById('location-title').textContent = langData.nav[3];

    // Contact Form
    document.getElementById('contact-title').textContent = langData.contact.title;
    document.getElementById('form-name').placeholder = langData.contact.namePlace;
    document.getElementById('form-email').placeholder = langData.contact.emailPlace;
    document.getElementById('form-message').placeholder = langData.contact.msgPlace;
    document.getElementById('form-submit').textContent = langData.contact.submit;

    // Footer
    document.getElementById('footer-rights').textContent = currentLang === 'ru' ? 'Все права защищены.' : (currentLang === 'uz' ? 'Barcha huquqlar himoyalangan.' : 'All rights reserved.');
}

const handleForm = () => {
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('form-name').value;
            const email = document.getElementById('form-email').value;
            const message = document.getElementById('form-message').value;

            try {
                const response = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, message })
                });
                if (response.ok) {
                    const successMsg = currentLang === 'ru' ? 'Спасибо!' : (currentLang === 'uz' ? 'Rahmat!' : 'Thank you!');
                    alert(successMsg);
                    form.reset();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
}

const navSlide = () => {
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    burger.addEventListener('click', () => {
        nav.classList.toggle('nav-active');
        burger.classList.toggle('toggle');
    });
}

const init = () => {
    fetchContent();
    navSlide();
    handleForm();
}

init();
