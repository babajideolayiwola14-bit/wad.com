// Nigeria States and LGAs Data
const nigeriaData = {
    "Abia": ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Isuikwuato", "Obi Ngwa", "Ohafia", "Osisioma Ngwa", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi"],
    "Adamawa": ["Demsa", "Fufure", "Ganye", "Guyuk", "Girei", "Gombi", "Hong", "Jada", "Lamurde", "Madagali", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"],
    "Akwa Ibom": ["Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan Uyo", "Ibeno", "Ibesikpo Asutan", "Ibiono-Ibom", "Ika", "Ikono", "Ikot Abasi", "Ikot Ekpene", "Ini", "Itu", "Mbo", "Mkpat-Eni", "Nsit-Atai", "Nsit-Ibom", "Nsit-Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anam", "Udung-Uko", "Ukanafun", "Uruan", "Urue-Offong/Oruko", "Uyo"],
    "Anambra": ["Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"],
    "Bauchi": ["Alkaleri", "Bauchi", "Bogoro", "Damban", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Itas/Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira", "Tafawa Balewa", "Toro", "Warji", "Zaki"],
    "Bayelsa": ["Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"],
    "Benue": ["Ado", "Agatu", "Apa", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Oturkpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"],
    "Borno": ["Abadam", "Askira/Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Gubio", "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kukawa", "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Marte", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani"],
    "Cross River": ["Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki", "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu", "Odukpani", "Ogoja", "Yakurr", "Yala"],
    "Delta": ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
    "Ebonyi": ["Abakaliki", "Afikpo", "Edda", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"],
    "Edo": ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba Okha", "Orhionmwon", "Oredo", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"],
    "Ekiti": ["Ado Ekiti", "Efon", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ikole", "Ilejemeje", "Irepodun/Ifelodun", "Ise/Orun", "Moba", "Oye"],
    "Enugu": ["Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo-Uwani"],
    "Gombe": ["Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
    "Imo": ["Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Isu", "Mbaitoli", "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North", "Owerri West", "Onuimo"],
    "Jigawa": ["Auyo", "Babura", "Birniwa", "Birnin Kudu", "Buji", "Dutse", "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kaugama", "Kazaure", "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori", "Miga", "Ringim", "Roni", "Sule Tankarkar", "Taura", "Yankwashi"],
    "Kaduna": ["Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"],
    "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Mallam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir", "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila", "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"],
    "Katsina": ["Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dandume", "Danja", "Dan Musa", "Daura", "Dutsi", "Dutsin Ma", "Faskari", "Funtua", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina", "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Matazu", "Musawa", "Rimi", "Sabuwa", "Safana", "Sandamu", "Zango"],
    "Kebbi": ["Aleiro", "Arewa", "Argungu", "Augie", "Bagudo", "Birnin Kebbi", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo"],
    "Kogi": ["Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela-Odolu", "Kabba/Bunu", "Mopa-Muro", "Ijumu", "Yagba West", "Yagba East", "Okene", "Okehi", "Lokoja", "Isanlu", "Olamaboro", "Omala"],
    "Kwara": ["Ekiti", "Ifelodun", "Ilorin East", "Ilorin West", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Pategi", "Baruten", "Asa", "Edu", "Ilorin South"],
    "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"],
    "Nasarawa": ["Akwanga", "Awe", "Doma", "Karu", "Lafia", "Keana", "Obi", "Kokona", "Keffi", "Nasarawa", "Nasarawa Eggon", "Wamba", "Toto"],
    "Niger": ["Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara", "Katcha", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mashegu", "Mokwa", "Munya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi"],
    "Ogun": ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Ewekoro", "Ifo", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ijebu East", "Ilishan-Remo", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Shagamu", "Yewa North", "Yewa South", "Isara"],
    "Ondo": ["Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Akure North", "Akure South", "Ese Odo", "Ifedore", "Idanre", "Ilaje", "Ile-Oluji/Okeigbo", "Irele", "Odigbo", "Okitipupa", "Ondo West", "Ondo East", "Ose", "Owo"],
    "Osun": ["Aiyedaade", "Aiyedire", "Atakunmosa East", "Atakunmosa West", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Egbedore", "Ejigbo", "Ife Central", "Ife East", "Ife North", "Ife South", "Ifedayo", "Ifelodun", "Isokan", "Obokun", "Irewole", "Ola-Oluwa", "Olorunda", "Ilesa West", "Ilesa East", "Odo-Otin", "Ila", "Ori-Ade", "Orolu", "Irepodun", "Iwo", "Osogbo"],
    "Oyo": ["Afijio", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East", "Ibarapa North", "Ido", "Irepo", "Iwajowa", "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Orire", "Atisbo", "Saki West", "Saki East", "Egbeda", "Lagel", "Atiba", "Oyo East", "Oyo West"],
    "Plateau": ["Barkin Ladi", "Bassa", "Bokkos", "Jos East", "Jos North", "Jos South", "Kanam", "Kanke", "Langtang North", "Langtang South", "Mangu", "Mikang", "Pankshin", "Qua'an-Pan", "Riyom", "Shendam", "Wase"],
    "Rivers": ["Abua-Odual", "Ahoada East", "Ahoada West", "Akuku Toru", "Andoni", "Asari Toru", "Bonny", "Degema", "Eleme", "Emohua", "Etche", "Gokana", "Ikwerre", "Khana", "Obio-Akpor", "Ogba-Egbema-Ndoni", "Ogu-Bolo", "Okirika", "Omuma", "Opobo-Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
    "Sokoto": ["Binji", "Bodinga", "Dange Shuni", "Gada", "Sokoto South", "Sokoto North", "Gwadabawa", "Wamakko", "Tangaza", "Sabon Birni", "Isah", "Rabah", "Silame", "Wurno", "Goronyo", "Illela", "Gudu", "Tureta", "Tambuwal", "Kware"],
    "Taraba": ["Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido", "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"],
    "Yobe": ["Bade", "Bursari", "Damaturu", "Fika", "Fune", "Geidam", "Gujba", "Gulani", "Jakusko", "Karasuwa", "Machina", "Nangere", "Nguru", "Potiskum", "Tarmuwa", "Yunusari", "Yusufari"],
    "Zamfara": ["Anka", "Bakura", "Birnin Magaji/Kiyaw", "Bukkuyum", "Bungudu", "Tsafe", "Gummi", "Gusau", "Kaura-Namoda", "Maradun", "Maru", "Shinkafi", "Talata-Mafara", "Zurmi"],
    "Federal Capital Territory": ["Abaji", "Abuja Municipal Area Council", "Kwali", "Kuje", "Bwari", "Gwagwalada"]
};

function showChatUI() {
    const login = document.getElementById('login-container');
    const register = document.getElementById('register-container');
    const chat = document.getElementById('chat-container');
    if (login) login.style.display = 'none';
    if (register) register.style.display = 'none';
    if (chat) chat.style.display = 'block';
}

function showLoginUI() {
    const login = document.getElementById('login-container');
    const register = document.getElementById('register-container');
    const chat = document.getElementById('chat-container');
    if (login) login.style.display = 'block';
    if (register) register.style.display = 'none';
    if (chat) chat.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    populateStates();
    populateRegisterLGAs();
    populateRegisterFormLGAs();
    setupEventListeners();

    const token = localStorage.getItem('token');
    if (token && (await resumeSession())) {
        showChatUI();
    } else {
        showLoginUI();
    }
}

function setupEventListeners() {
    const getElement = (...ids) => ids.map(id => document.getElementById(id)).find(el => el);

    // Modal toggle - use mousedown which fires even on disabled elements
    const messageInput = getElement('message');
    const formWrapper = getElement('message-form-wrapper');

    if (messageInput) {
        messageInput.addEventListener('mousedown', (e) => {
            if (!localStorage.getItem('token')) {
                e.preventDefault();
                showLoginUI();
            }
        });
    }

    bindPasswordToggle('toggle-password', 'password');
    bindPasswordToggle('toggle-reg-password', 'reg-password');

    const stateSelect = document.getElementById('state');
    if (stateSelect) stateSelect.addEventListener('change', populateRegisterLGAs);

    const registerStateSelect = document.getElementById('register-state');
    if (registerStateSelect) registerStateSelect.addEventListener('change', populateRegisterFormLGAs);

    // Modal / page toggles
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeLoginModal);

    const closeRegisterModalBtn = document.getElementById('close-register-modal');
    if (closeRegisterModalBtn) closeRegisterModalBtn.addEventListener('click', closeRegisterModal);

    const toggleRegisterBtn = getElement('toggle-register', 'show-register');
    if (toggleRegisterBtn) toggleRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openRegisterModal();
    });

    const toggleLoginBtn = getElement('toggle-login', 'show-login');
    if (toggleLoginBtn) toggleLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openLoginModal();
    });

    // Login form
    const loginForm = getElement('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // Register form
    const registerForm = getElement('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const forgotLink = document.getElementById('forgot-link');
    if (forgotLink) forgotLink.addEventListener('click', handleForgotPassword);
}

// Modal functions
function openLoginModal() {
    const modal = document.getElementById('login-modal');
    const registerContainer = document.getElementById('register-container');
    const container = document.getElementById('login-container');
    if (modal) modal.classList.remove('hidden');
    if (registerContainer) registerContainer.style.display = 'none';
    if (container) container.style.display = 'block';

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();

    const loginError = document.getElementById('login-error') || document.getElementById('error-message');
    if (loginError) loginError.classList.remove('show');
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.add('hidden');
}

function openRegisterModal() {
    const modal = document.getElementById('register-modal');
    const loginContainer = document.getElementById('login-container');
    const container = document.getElementById('register-container');
    if (modal) modal.classList.remove('hidden');
    if (loginContainer) loginContainer.style.display = 'none';
    if (container) container.style.display = 'block';

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.reset();

    const registerError = document.getElementById('register-error') || document.getElementById('register-message');
    if (registerError) registerError.classList.remove('show');

    // Repopulate states and reset LGAs
    populateStates();
    populateRegisterFormLGAs();
}

function closeRegisterModal() {
    const modal = document.getElementById('register-modal');
    if (modal) modal.classList.add('hidden');
}

function fillStateSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="">Select State</option>';
    Object.keys(nigeriaData).sort().forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        selectEl.appendChild(option);
    });
}

function populateStates() {
    fillStateSelect(document.getElementById('state'));
    fillStateSelect(document.getElementById('register-state'));
}

function fillLgaSelect(stateValue, lgaSelect) {
    if (!lgaSelect) return;
    lgaSelect.innerHTML = '<option value="">Select LGA</option>';
    if (stateValue && nigeriaData[stateValue]) {
        nigeriaData[stateValue].forEach(lga => {
            const option = document.createElement('option');
            option.value = lga;
            option.textContent = lga;
            lgaSelect.appendChild(option);
        });
    }
}

function populateRegisterLGAs() {
    const loginState = document.getElementById('state');
    const loginLga = document.getElementById('lga');
    if (loginState && loginLga) {
        fillLgaSelect(loginState.value, loginLga);
    }
}

function populateRegisterFormLGAs() {
    const regState = document.getElementById('register-state');
    const regLga = document.getElementById('register-lga');
    if (regState && regLga) {
        fillLgaSelect(regState.value, regLga);
    }
}

function bindPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const pwInput = document.getElementById(inputId);
    if (!toggle || !pwInput) return;
    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
        toggle.textContent = pwInput.type === 'password' ? '👁️' : '🙈';
        toggle.setAttribute('aria-label', pwInput.type === 'password' ? 'Show password' : 'Hide password');
    });
}

function showFormError(el, message, isSuccess) {
    if (!el) return;
    el.textContent = message;
    el.style.color = isSuccess ? 'green' : 'red';
    el.classList.add('show');
    el.style.display = 'block';
}

function clearFormError(el) {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
    el.style.display = '';
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('login-username') || document.getElementById('username');
    const passwordInput = document.getElementById('login-password') || document.getElementById('password');
    const stateInput = document.getElementById('state');
    const lgaInput = document.getElementById('lga');
    const errorEl = document.getElementById('login-error') || document.getElementById('error-message');

    const username = usernameInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    const state = stateInput?.value || '';
    const lga = lgaInput?.value || '';

    clearFormError(errorEl);

    if (!username || !password) {
        showFormError(errorEl, 'Please enter username and password.');
        return;
    }
    if (!state || !lga) {
        showFormError(errorEl, 'Please select your State and Local Government.');
        return;
    }
    
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, state, lga })
        });
        
        const raw = await res.text();
        let data = {};
        try {
            data = raw ? JSON.parse(raw) : {};
        } catch {
            throw new Error('Server error. Please try again in a moment.');
        }
        
        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.state) localStorage.setItem('state', data.user.state);
        if (data.user.lga) localStorage.setItem('lga', data.user.lga);

        window.location.reload();
        return;
    } catch (err) {
        showFormError(errorEl, err.message || 'Login failed. Check your details and try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('reg-username');
    const passwordInput = document.getElementById('reg-password');
    const stateInput = document.getElementById('register-state');
    const lgaInput = document.getElementById('register-lga');
    const errorEl = document.getElementById('register-error') || document.getElementById('register-message');

    const username = usernameInput?.value.trim() || '';
    const password = passwordInput?.value.trim() || '';
    const state = stateInput?.value || '';
    const lga = lgaInput?.value || '';
    
    // Validate password
    clearFormError(errorEl);

    if (!state || !lga) {
        showFormError(errorEl, 'Please select your State and Local Government.');
        return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        showFormError(errorEl, 'Password must be at least 8 characters with uppercase, lowercase, and numbers');
        return;
    }
    
    try {
        const emailInput = document.getElementById('reg-email');
        const email = emailInput?.value.trim() || '';
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, state, lga, email: email || undefined })
        });
        
        const raw = await res.text();
        let data = {};
        try {
            data = raw ? JSON.parse(raw) : {};
        } catch {
            throw new Error('Server error. Please try again.');
        }
        
        if (!res.ok) {
            throw new Error(data.message || 'Registration failed');
        }
        
        showFormError(errorEl, 'Registration successful! Please login.', true);
        
        setTimeout(() => {
            openLoginModal();
        }, 1500);
        
    } catch (err) {
        showFormError(errorEl, err.message || 'Registration failed.');
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const suggestedUsername = usernameInput?.value.trim() || '';
    const username = prompt('Enter your username to request a password reset:', suggestedUsername);
    if (!username) return;

    await requestPasswordReset(username.trim());
}

async function requestPasswordReset(username, email) {
    try {
        const body = { username };
        if (email) body.email = email;

        const res = await fetch('/auth/request-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 400 && data.requireEmail) {
            const suppliedEmail = prompt('No email is saved for this account. Enter your email address:');
            if (!suppliedEmail) return;
            return requestPasswordReset(username, suppliedEmail.trim());
        }

        if (data.token || data.resetUrl) {
            if (data.token) {
                window.location.href = `/reset.html?token=${encodeURIComponent(data.token)}`;
            } else {
                window.location.href = data.resetUrl;
            }
            return;
        }

        alert(data.message || 'If that account exists, reset instructions were sent.');
    } catch (err) {
        console.error('Request reset failed', err);
        alert('Failed to request password reset. Try again later.');
    }
}

// Expose for any legacy inline handlers
window.populateRegisterLGAs = populateRegisterLGAs;
window.populateRegisterFormLGAs = populateRegisterFormLGAs;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.openLoginModal = openLoginModal;
window.openRegisterModal = openRegisterModal;

async function resumeSession() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        if (data.profile) {
            localStorage.setItem('user', JSON.stringify(data.profile));
        }
        return true;
    } catch (err) {
        console.log('Session resume failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('state');
        localStorage.removeItem('lga');
        return false;
    }
}
