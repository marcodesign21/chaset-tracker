// Chaset App with Backend API
const API_URL = window.location.origin;

class ChasetApp {
    constructor() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.activeTab = 'bilanci';
        this.transactions = [];
        this.credentials = [];
        this.showPasswords = {};
        
        this.loginData = { username: '', password: '' };
        this.newTransaction = {
            description: '',
            amount: '',
            type: 'spesa',
            category: 'altro',
            date: this.getTodayDate()
        };
        this.newCredential = {
            service: '',
            email: '',
            password: '',
            notes: ''
        };
        
        this.init();
    }
    
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }
    
    async init() {
        this.checkLoginStatus();
        this.render();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    checkLoginStatus() {
        const userData = localStorage.getItem('chaset-user');
        if (userData) {
            const user = JSON.parse(userData);
            this.isLoggedIn = true;
            this.currentUser = user;
            this.loadData();
        }
    }
    
    async login() {
        const username = this.loginData.username.trim();
        const password = this.loginData.password.trim();
        
        if (!username || !password) {
            alert('Inserisci username e password');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.isLoggedIn = true;
                this.currentUser = data.user;
                localStorage.setItem('chaset-user', JSON.stringify(data.user));
                await this.loadData();
                this.render();
                if (typeof lucide !== 'undefined') lucide.createIcons();
                if (data.message) alert(data.message);
            } else {
                alert(data.error || 'Errore durante il login');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Errore di connessione al server');
        }
    }
    
    logout() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.transactions = [];
        this.credentials = [];
        localStorage.removeItem('chaset-user');
        this.render();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    async loadData() {
        if (!this.currentUser) return;
        
        try {
            const [txResponse, credResponse] = await Promise.all([
                fetch(`${API_URL}/api/transactions/${this.currentUser.id}`),
                fetch(`${API_URL}/api/credentials/${this.currentUser.id}`)
            ]);
            
            this.transactions = await txResponse.json();
            this.credentials = await credResponse.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    async addTransaction() {
        if (!this.newTransaction.description || !this.newTransaction.amount) return;
        
        try {
            const response = await fetch(`${API_URL}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    ...this.newTransaction,
                    amount: parseFloat(this.newTransaction.amount)
                })
            });
            
            const transaction = await response.json();
            this.transactions.unshift(transaction);
            
            this.newTransaction = {
                description: '',
                amount: '',
                type: 'spesa',
                category: 'altro',
                date: this.getTodayDate()
            };
            
            this.render();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Errore nell\'aggiunta della transazione');
        }
    }
    
    async deleteTransaction(id) {
        try {
            await fetch(`${API_URL}/api/transactions/${id}`, { method: 'DELETE' });
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.render();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    }
    
    async addCredential() {
        if (!this.newCredential.service || !this.newCredential.email) return;
        
        try {
            const response = await fetch(`${API_URL}/api/credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    ...this.newCredential
                })
            });
            
            const credential = await response.json();
            this.credentials.unshift(credential);
            
            this.newCredential = {
                service: '',
                email: '',
                password: '',
                notes: ''
            };
            
            this.render();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (error) {
            console.error('Error adding credential:', error);
            alert('Errore nell\'aggiunta della credenziale');
        }
    }
    
    async deleteCredential(id) {
        try {
            await fetch(`${API_URL}/api/credentials/${id}`, { method: 'DELETE' });
            this.credentials = this.credentials.filter(c => c.id !== id);
            this.render();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (error) {
            console.error('Error deleting credential:', error);
        }
    }
    
    togglePasswordVisibility(id) {
        this.showPasswords[id] = !this.showPasswords[id];
        this.render();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    switchTab(tab) {
        this.activeTab = tab;
        this.render();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    calculateBalance() {
        return this.transactions.reduce((acc, t) => {
            return t.type === 'entrata' ? acc + parseFloat(t.amount) : acc - parseFloat(t.amount);
        }, 0);
    }
    
    getTotalEntrate() {
        return this.transactions
            .filter(t => t.type === 'entrata')
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
    }
    
    getTotalSpese() {
        return this.transactions
            .filter(t => t.type === 'spesa')
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
    }
    
    render() {
        const app = document.getElementById('app');
        app.innerHTML = this.isLoggedIn ? this.getMainHTML() : this.getLoginHTML();
        this.attachEventListeners();
    }
    
    getLoginHTML() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
                <div class="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 w-full max-w-md">
                    <div class="text-center mb-8">
                        <div class="inline-block p-4 bg-purple-600 rounded-full mb-4">
                            <i data-lucide="lock" class="text-white" style="width: 32px; height: 32px;"></i>
                        </div>
                        <h1 class="text-3xl font-bold text-white mb-2">Chaset</h1>
                        <p class="text-purple-200">Accedi al tuo account</p>
                    </div>
                    
                    <div class="space-y-4 mb-6">
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">Username</label>
                            <input type="text" id="login-username" placeholder="Inserisci il tuo username"
                                class="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500">
                        </div>
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">Password</label>
                            <input type="password" id="login-password" placeholder="Inserisci la tua password"
                                class="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500">
                        </div>
                    </div>
                    
                    <button onclick="app.login()" 
                        class="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 justify-center transition-all">
                        <i data-lucide="log-in"></i>
                        Accedi
                    </button>
                    
                    <div class="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                        <p class="text-blue-200 text-sm text-center">
                            <i data-lucide="info" class="inline-block mr-1" style="width: 16px; height: 16px;"></i>
                            Prima volta? Verrà creato un nuovo account
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    
    getMainHTML() {
        const balance = this.calculateBalance();
        const totalEntrate = this.getTotalEntrate();
        const totalSpese = this.getTotalSpese();
        
        return `
            <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div class="max-w-6xl mx-auto p-6">
                    <div class="text-center mb-8">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex-1"></div>
                            <div class="flex-1 text-center">
                                <h1 class="text-4xl font-bold text-white mb-2">Chaset</h1>
                                <p class="text-purple-200">Benvenuto, ${this.currentUser.username}!</p>
                            </div>
                            <div class="flex-1 flex justify-end">
                                <button onclick="app.logout()" 
                                    class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-semibold flex items-center gap-2 transition-all border border-red-500/50">
                                    <i data-lucide="log-out"></i>
                                    Esci
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-4 mb-6">
                        <button onclick="app.switchTab('bilanci')" class="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                            this.activeTab === 'bilanci' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }">
                            <i data-lucide="wallet"></i> Bilanci
                        </button>
                        <button onclick="app.switchTab('credenziali')" class="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                            this.activeTab === 'credenziali' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }">
                            <i data-lucide="lock"></i> Credenziali
                        </button>
                    </div>

                    ${this.activeTab === 'bilanci' ? this.renderBilanci(balance, totalEntrate, totalSpese) : this.renderCredenziali()}
                </div>
            </div>
        `;
    }
    
    renderBilanci(balance, totalEntrate, totalSpese) {
        return `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <div class="flex items-center gap-3 mb-2">
                            <i data-lucide="trending-up" class="text-green-400"></i>
                            <span class="text-white/80">Entrate</span>
                        </div>
                        <p class="text-3xl font-bold text-green-400">€${totalEntrate.toFixed(2)}</p>
                    </div>
                    <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <div class="flex items-center gap-3 mb-2">
                            <i data-lucide="trending-down" class="text-red-400"></i>
                            <span class="text-white/80">Spese</span>
                        </div>
                        <p class="text-3xl font-bold text-red-400">€${totalSpese.toFixed(2)}</p>
                    </div>
                    <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <div class="flex items-center gap-3 mb-2">
                            <i data-lucide="wallet" class="text-purple-400"></i>
                            <span class="text-white/80">Bilancio</span>
                        </div>
                        <p class="text-3xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}">€${balance.toFixed(2)}</p>
                    </div>
                </div>

                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h2 class="text-xl font-bold text-white mb-4">Nuova Transazione</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input type="text" id="tx-description" placeholder="Descrizione"
                            class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black placeholder-gray-500 focus:outline-none focus:border-purple-500">
                        <input type="number" id="tx-amount" step="0.01" placeholder="Importo"
                            class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black placeholder-gray-500 focus:outline-none focus:border-purple-500">
                        <select id="tx-type" class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black focus:outline-none focus:border-purple-500">
                            <option value="spesa">Spesa</option>
                            <option value="entrata">Entrata</option>
                        </select>
                        <select id="tx-category" class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black focus:outline-none focus:border-purple-500">
                            <option value="cibo">Cibo</option>
                            <option value="trasporti">Trasporti</option>
                            <option value="bollette">Bollette</option>
                            <option value="stipendio">Stipendio</option>
                            <option value="svago">Svago</option>
                            <option value="altro">Altro</option>
                        </select>
                        <input type="date" id="tx-date" value="${this.getTodayDate()}"
                            class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black focus:outline-none focus:border-purple-500">
                    </div>
                    <button onclick="app.addTransaction()" 
                        class="w-full md:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 justify-center transition-all">
                        <i data-lucide="plus-circle"></i> Aggiungi
                    </button>
                </div>

                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h2 class="text-xl font-bold text-white mb-4">Transazioni Recenti</h2>
                    <div class="space-y-2">
                        ${this.transactions.length === 0 ? 
                            '<p class="text-white/50 text-center py-8">Nessuna transazione</p>' :
                            this.transactions.map(tx => `
                                <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3">
                                            <span class="text-white font-semibold">${tx.description}</span>
                                            <span class="text-xs px-2 py-1 rounded bg-purple-500/30 text-purple-200">${tx.category}</span>
                                        </div>
                                        <p class="text-white/50 text-sm">${tx.date}</p>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <span class="text-lg font-bold ${tx.type === 'entrata' ? 'text-green-400' : 'text-red-400'}">
                                            ${tx.type === 'entrata' ? '+' : '-'}€${parseFloat(tx.amount).toFixed(2)}
                                        </span>
                                        <button onclick="app.deleteTransaction(${tx.id})" 
                                            class="p-2 hover:bg-red-500/20 rounded-lg">
                                            <i data-lucide="trash-2" class="text-red-400"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCredenziali() {
        return `
            <div class="space-y-6">
                <div class="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                    <i data-lucide="alert-triangle" class="text-red-400 mt-1"></i>
                    <div class="text-white">
                        <p class="font-bold mb-1">⚠️ AVVISO SICUREZZA</p>
                        <p class="text-sm">Password non crittografate. Usa solo per credenziali non importanti.</p>
                    </div>
                </div>

                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h2 class="text-xl font-bold text-white mb-4">Nuova Credenziale</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input type="text" id="cred-service" placeholder="Servizio"
                            class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black placeholder-gray-500 focus:outline-none focus:border-purple-500">
                        <input type="email" id="cred-email" placeholder="Email"
                            class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black placeholder-gray-500 focus:outline-none focus:border-purple-500">
                        <input type="password" id="cred-password" placeholder="Password"
                            class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black placeholder-gray-500 focus:outline-none focus:border-purple-500">
                        <input type="text" id="cred-notes" placeholder="Note"
                            class="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-black placeholder-gray-500 focus:outline-none focus:border-purple-500">
                    </div>
                    <button onclick="app.addCredential()" 
                        class="w-full md:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 justify-center transition-all">
                        <i data-lucide="plus-circle"></i> Aggiungi
                    </button>
                </div>

                <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h2 class="text-xl font-bold text-white mb-4">Credenziali Salvate</h2>
                    <div class="space-y-3">
                        ${this.credentials.length === 0 ? 
                            '<p class="text-white/50 text-center py-8">Nessuna credenziale</p>' :
                            this.credentials.map(cred => `
                                <div class="p-4 bg-white/5 rounded-lg">
                                    <div class="flex items-start justify-between">
                                        <div class="flex-1">
                                            <h3 class="text-white font-bold text-lg mb-1">${cred.service}</h3>
                                            <p class="text-purple-300 text-sm mb-2">${cred.email}</p>
                                            <div class="flex items-center gap-2">
                                                <input type="${this.showPasswords[cred.id] ? 'text' : 'password'}" 
                                                    value="${cred.password}" readonly
                                                    class="px-3 py-1 rounded bg-white/5 border border-white/20 text-white text-sm flex-1">
                                                <button onclick="app.togglePasswordVisibility(${cred.id})" 
                                                    class="p-2 hover:bg-white/10 rounded">
                                                    <i data-lucide="${this.showPasswords[cred.id] ? 'eye-off' : 'eye'}" class="text-white/70"></i>
                                                </button>
                                            </div>
                                            ${cred.notes ? `<p class="text-white/50 text-sm mt-2">Note: ${cred.notes}</p>` : ''}
                                        </div>
                                        <button onclick="app.deleteCredential(${cred.id})" 
                                            class="p-2 hover:bg-red-500/20 rounded-lg ml-3">
                                            <i data-lucide="trash-2" class="text-red-400"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const loginUsername = document.getElementById('login-username');
        const loginPassword = document.getElementById('login-password');
        
        if (loginUsername) {
            loginUsername.addEventListener('input', (e) => this.loginData.username = e.target.value);
            loginUsername.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.login(); });
        }
        if (loginPassword) {
            loginPassword.addEventListener('input', (e) => this.loginData.password = e.target.value);
            loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.login(); });
        }
        
        const txDesc = document.getElementById('tx-description');
        const txAmount = document.getElementById('tx-amount');
        const txType = document.getElementById('tx-type');
        const txCategory = document.getElementById('tx-category');
        const txDate = document.getElementById('tx-date');
        
        if (txDesc) txDesc.addEventListener('input', (e) => this.newTransaction.description = e.target.value);
        if (txAmount) txAmount.addEventListener('input', (e) => this.newTransaction.amount = e.target.value);
        if (txType) txType.addEventListener('change', (e) => this.newTransaction.type = e.target.value);
        if (txCategory) txCategory.addEventListener('change', (e) => this.newTransaction.category = e.target.value);
        if (txDate) txDate.addEventListener('change', (e) => this.newTransaction.date = e.target.value);
        
        const credService = document.getElementById('cred-service');
        const credEmail = document.getElementById('cred-email');
        const credPassword = document.getElementById('cred-password');
        const credNotes = document.getElementById('cred-notes');
        
        if (credService) credService.addEventListener('input', (e) => this.newCredential.service = e.target.value);
        if (credEmail) credEmail.addEventListener('input', (e) => this.newCredential.email = e.target.value);
        if (credPassword) credPassword.addEventListener('input', (e) => this.newCredential.password = e.target.value);
        if (credNotes) credNotes.addEventListener('input', (e) => this.newCredential.notes = e.target.value);
    }
}

let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new ChasetApp();
    });
} else {
    app = new ChasetApp();
}