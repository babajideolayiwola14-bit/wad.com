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

// Global state
let isAuthenticated = false;
let currentUser = null;
let socket = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Populate state selects
    populateStates();
    
    // Check for existing session
    const token = localStorage.getItem('token');
    if (token) {
        await resumeSession();
    } else {
        // Load messages in read-only mode
        loadMessagesReadOnly();
        setupGuestUI();
    }
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Modal toggle - use mousedown which fires even on disabled elements
    const messageInput = document.getElementById('message');
    const formWrapper = document.getElementById('message-form-wrapper');
    
    messageInput.addEventListener('mousedown', (e) => {
        if (!isAuthenticated) {
            e.preventDefault();
            openLoginModal();
        }
    });
    
    formWrapper.addEventListener('click', (e) => {
        if (!isAuthenticated && e.target === messageInput) {
            e.preventDefault();
            openLoginModal();
        }
    });
    
    // Modal close buttons
    document.getElementById('close-modal').addEventListener('click', closeLoginModal);
    document.getElementById('close-register-modal').addEventListener('click', closeRegisterModal);
    
    // Modal toggle links
    document.getElementById('toggle-register').addEventListener('click', (e) => {
        e.preventDefault();
        closeLoginModal();
        openRegisterModal();
    });
    
    document.getElementById('toggle-login').addEventListener('click', (e) => {
        e.preventDefault();
        closeRegisterModal();
        openLoginModal();
    });
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Register state change
    document.getElementById('register-state').addEventListener('change', populateRegisterLGAs);
    
    // Message form
    document.getElementById('message-form-wrapper').addEventListener('submit', handleSendMessage);
    
    // Logout button
    document.getElementById('logout').addEventListener('click', handleLogout);
}

// Modal functions
function openLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.remove('show');
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
}

function openRegisterModal() {
    document.getElementById('register-modal').classList.remove('hidden');
    document.getElementById('register-form').reset();
    document.getElementById('register-error').classList.remove('show');
}

function closeRegisterModal() {
    document.getElementById('register-modal').classList.add('hidden');
}

// Populate states in register form
function populateStates() {
    const select = document.getElementById('register-state');
    select.innerHTML = '<option value="">Select State</option>';
    Object.keys(nigeriaData).forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        select.appendChild(option);
    });
}

function populateRegisterLGAs() {
    const stateSelect = document.getElementById('register-state');
    const lgaSelect = document.getElementById('register-lga');
    const selectedState = stateSelect.value;
    
    lgaSelect.innerHTML = '<option value="">Select LGA</option>';
    if (selectedState && nigeriaData[selectedState]) {
        nigeriaData[selectedState].forEach(lga => {
            const option = document.createElement('option');
            option.value = lga;
            option.textContent = lga;
            lgaSelect.appendChild(option);
        });
    }
}

// Load messages in read-only mode
async function loadMessagesReadOnly() {
    try {
        const res = await fetch('/messages');
        if (!res.ok) throw new Error('Failed to load messages');
        
        const data = await res.json();
        const messages = data.messages || [];
        
        displayMessages(messages);
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

function displayMessages(messages) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    
    messages.forEach(msg => {
        const msgEl = createMessageElement(msg);
        container.appendChild(msgEl);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = 'message-item';
    
    const userSpan = document.createElement('span');
    userSpan.className = 'message-user';
    userSpan.textContent = msg.username || 'Unknown';
    userSpan.style.fontWeight = 'bold';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'message-text';
    textSpan.textContent = msg.message;
    textSpan.style.whiteSpace = 'pre-wrap';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = new Date(msg.created_at).toLocaleString();
    timeSpan.style.fontSize = '12px';
    timeSpan.style.color = '#666';
    timeSpan.style.marginLeft = 'auto';
    
    div.appendChild(userSpan);
    div.appendChild(textSpan);
    div.appendChild(timeSpan);
    
    return div;
}

function setupGuestUI() {
    document.getElementById('guest-badge').classList.remove('hidden');
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('message').disabled = true;
    document.getElementById('send-btn').disabled = true;
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorEl = document.getElementById('login-error');
    
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.state) localStorage.setItem('state', data.user.state);
        if (data.user.lga) localStorage.setItem('lga', data.user.lga);
        
        // Switch to authenticated mode
        isAuthenticated = true;
        currentUser = data.user;
        
        closeLoginModal();
        setupAuthenticatedUI();
        connectSocket();
        
        // Reload messages from socket
        loadMessagesAuthenticated();
        
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('show');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const state = document.getElementById('register-state').value;
    const lga = document.getElementById('register-lga').value;
    const errorEl = document.getElementById('register-error');
    
    // Validate password
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        errorEl.textContent = 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
        errorEl.classList.add('show');
        return;
    }
    
    try {
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, state, lga })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || 'Registration failed');
        }
        
        errorEl.textContent = 'Registration successful! Please login.';
        errorEl.style.color = 'green';
        errorEl.classList.add('show');
        
        setTimeout(() => {
            closeRegisterModal();
            openLoginModal();
        }, 1500);
        
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('show');
    }
}

async function resumeSession() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            throw new Error('Session expired');
        }
        
        const data = await res.json();
        currentUser = data.profile;
        isAuthenticated = true;
        
        setupAuthenticatedUI();
        connectSocket();
        loadMessagesAuthenticated();
        
    } catch (err) {
        console.log('Session resume failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        loadMessagesReadOnly();
        setupGuestUI();
    }
}

function setupAuthenticatedUI() {
    document.getElementById('guest-badge').classList.add('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('current-user').textContent = currentUser.username;
    document.getElementById('message').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('message').placeholder = 'Type a message...';
}

function connectSocket() {
    if (socket) return;
    
    const token = localStorage.getItem('token');
    socket = io({
        auth: { token }
    });
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('new-message', (msg) => {
        addMessageToUI(msg);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

function loadMessagesAuthenticated() {
    // Messages will be loaded via socket.io after connection
    // For now, reload from REST
    loadMessagesReadOnly();
}

function addMessageToUI(msg) {
    const container = document.getElementById('chat-messages');
    const msgEl = createMessageElement(msg);
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
}

async function handleSendMessage(e) {
    e.preventDefault();
    
    const msgInput = document.getElementById('message');
    const message = msgInput.value.trim();
    
    if (!message) return;
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });
        
        if (!res.ok) {
            const data = await res.json();
            alert(data.message || 'Failed to send message');
            return;
        }
        
        msgInput.value = '';
        
    } catch (err) {
        console.error('Error sending message:', err);
        alert('Failed to send message');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('state');
    localStorage.removeItem('lga');
    
    isAuthenticated = false;
    currentUser = null;
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    setupGuestUI();
    loadMessagesReadOnly();
}
