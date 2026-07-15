(function () {
  "use strict";

  var I18N = {
    uz: {
      navAbout: "Biz haqimizda", navServices: "Xizmatlar", navMenu: "Menyu", navSchedule: "Yetkazish jadvali", navContact: "Aloqa", navCta: "So'rov qoldirish",
      heroEyebrow: "Kundalik tushlik · Ketering", heroCta1: "So'rov qoldirish", heroCta2: "Xizmatlar bilan tanishish",
      aboutEyebrow: "Biz haqimizda", servicesEyebrow: "Xizmatlar", menuEyebrow: "Menyu", scheduleEyebrow: "Kunlik jadval", contactEyebrow: "Aloqa",
      infoPhoneLabel: "Telefon", infoEmailLabel: "Email", infoAddressLabel: "Manzil", infoHoursLabel: "Buyurtma vaqti",
      formName: "Ism-familiya", formPhone: "Telefon raqam", formCompany: "Kompaniya nomi (ixtiyoriy)", formMessage: "Xabar (ixtiyoriy)",
      formSubmit: "Yuborish", formSuccess: "So'rovingiz qabul qilindi. Tez orada siz bilan bog'lanamiz!",
      formError: "Xatolik yuz berdi. Iltimos, birozdan so'ng qayta urining yoki telefon orqali bog'laning."
    },
    ru: {
      navAbout: "О нас", navServices: "Услуги", navMenu: "Меню", navSchedule: "График доставки", navContact: "Контакты", navCta: "Оставить заявку",
      heroEyebrow: "Ежедневные обеды · Кейтеринг", heroCta1: "Оставить заявку", heroCta2: "Смотреть услуги",
      aboutEyebrow: "О нас", servicesEyebrow: "Услуги", menuEyebrow: "Меню", scheduleEyebrow: "Дневной график", contactEyebrow: "Контакты",
      infoPhoneLabel: "Телефон", infoEmailLabel: "Email", infoAddressLabel: "Адрес", infoHoursLabel: "Приём заявок",
      formName: "Имя и фамилия", formPhone: "Номер телефона", formCompany: "Название компании (необязательно)", formMessage: "Сообщение (необязательно)",
      formSubmit: "Отправить", formSuccess: "Ваша заявка принята. Мы скоро с вами свяжемся!",
      formError: "Произошла ошибка. Попробуйте ещё раз чуть позже или позвоните нам."
    }
  };

  var LANG_KEY = 'obedtime_lang';
  var currentLang = localStorage.getItem(LANG_KEY) || 'uz';

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function applyStaticI18n(lang) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = (I18N[lang] && I18N[lang][key]) || I18N.uz[key] || '';
    });
    document.querySelectorAll('#langToggle button').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    document.documentElement.lang = lang;
  }

  function applyContent(content) {
    document.querySelectorAll('[data-edit]').forEach(function (el) {
      var key = el.getAttribute('data-edit');
      if (content[key] !== undefined) el.innerHTML = content[key];
    });
  }

  function renderDishes(dishes) {
    var host = document.getElementById('dishGrid');
    host.innerHTML = '';
    if (!dishes.length) {
      host.innerHTML = '<div class="empty-state">Menyu tez orada to\'ldiriladi.</div>';
      return;
    }
    dishes.forEach(function (d) {
      var card = document.createElement('div');
      card.className = 'dish-card';
      var photoHtml = d.image
        ? '<img class="dish-photo" src="' + d.image + '" alt="' + escapeHtml(d.name) + '">'
        : '<div class="dish-photo ph">' + (d.emoji || '🍽️') + '</div>';
      card.innerHTML = photoHtml +
        '<div class="dish-body">' +
          '<div class="dish-name">' + escapeHtml(d.name) + '</div>' +
          '<div class="dish-price">' + escapeHtml(d.price) + '</div>' +
        '</div>';
      host.appendChild(card);
    });
  }

  async function loadLanguageData(lang) {
    try {
      var [contentRes, dishesRes] = await Promise.all([
        fetch('/api/content?lang=' + lang),
        fetch('/api/dishes?lang=' + lang)
      ]);
      var content = await contentRes.json();
      var dishes = await dishesRes.json();
      applyContent(content);
      renderDishes(dishes);
    } catch (e) {
      console.error('Failed to load site content:', e);
    }
  }

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyStaticI18n(lang);
    loadLanguageData(lang);
  }

  document.getElementById('langToggle').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    setLanguage(btn.getAttribute('data-lang'));
  });

  document.getElementById('burgerBtn').addEventListener('click', function () {
    document.getElementById('navlinks').classList.toggle('open');
    document.getElementById('navcta').classList.toggle('open');
  });

  document.getElementById('requestForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = document.getElementById('rf-name').value.trim();
    var phone = document.getElementById('rf-phone').value.trim();
    var company = document.getElementById('rf-company').value.trim();
    var message = document.getElementById('rf-message').value.trim();
    if (!name || !phone) return;

    var btn = document.getElementById('formSubmitBtn');
    var msg = document.getElementById('formMsg');
    btn.disabled = true;

    try {
      var res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, phone: phone, company: company, message: message })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');

      this.reset();
      msg.textContent = I18N[currentLang].formSuccess;
      msg.className = 'form-msg ok';
    } catch (err) {
      msg.textContent = I18N[currentLang].formError;
      msg.className = 'form-msg error';
    } finally {
      btn.disabled = false;
      setTimeout(function () { msg.className = 'form-msg'; }, 6000);
    }
  });

  applyStaticI18n(currentLang);
  loadLanguageData(currentLang);
})();
