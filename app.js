// Gestion du stockage local
class MedicamentManager {
    constructor() {
        this.medicaments = this.loadFromStorage();
        this.currentEditId = null;
        this.init();
    }

    init() {
        this.renderTable();
        this.updateStats();
        this.attachEventListeners();
    }

    // Charger depuis localStorage
    loadFromStorage() {
        const data = localStorage.getItem('medicaments_scg');
        return data ? JSON.parse(data) : [];
    }

    // Sauvegarder dans localStorage
    saveToStorage() {
        localStorage.setItem('medicaments_scg', JSON.stringify(this.medicaments));
    }

    // Générer un ID unique
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Ajouter un médicament
    addMedicament(medicament) {
        const newMed = {
            id: this.generateId(),
            ...medicament,
            dateAjout: new Date().toISOString()
        };
        this.medicaments.push(newMed);
        this.saveToStorage();
        this.renderTable();
        this.updateStats();
        return newMed;
    }

    // Modifier un médicament
    updateMedicament(id, updates) {
        const index = this.medicaments.findIndex(m => m.id === id);
        if (index !== -1) {
            this.medicaments[index] = { ...this.medicaments[index], ...updates };
            this.saveToStorage();
            this.renderTable();
            this.updateStats();
        }
    }

    // Supprimer un médicament
    deleteMedicament(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce médicament ?')) {
            this.medicaments = this.medicaments.filter(m => m.id !== id);
            this.saveToStorage();
            this.renderTable();
            this.updateStats();
        }
    }

    // Ajuster la quantité
    adjustQuantity(id) {
        const med = this.medicaments.find(m => m.id === id);
        if (!med) return;

        const adjustment = prompt(`Quantité actuelle: ${med.quantite} ${med.unite}\n\nEntrez l'ajustement (+ ou -):\nExemple: +5 ou -3`);
        
        if (adjustment) {
            const value = parseInt(adjustment);
            if (!isNaN(value)) {
                const newQuantity = Math.max(0, med.quantite + value);
                this.updateMedicament(id, { quantite: newQuantity });
            }
        }
    }

    // Calculer le statut
    getStatus(med) {
        const today = new Date();
        const expDate = med.dateExpiration ? new Date(med.dateExpiration) : null;
        
        // Vérifier expiration
        if (expDate) {
            const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry < 0) {
                return { text: 'Périmé', class: 'badge-danger' };
            } else if (daysUntilExpiry <= 30) {
                return { text: 'Expire bientôt', class: 'badge-warning' };
            }
        }
        
        // Vérifier stock faible
        if (med.quantite <= med.seuilMin) {
            return { text: 'Stock faible', class: 'badge-warning' };
        }
        
        return { text: 'Disponible', class: 'badge-success' };
    }

    // Filtrer les médicaments
    filterMedicaments(searchTerm, categorie, stockFilter) {
        return this.medicaments.filter(med => {
            const matchSearch = med.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (med.emplacement && med.emplacement.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchCategorie = !categorie || med.categorie === categorie;
            
            let matchStock = true;
            if (stockFilter === 'low') {
                matchStock = med.quantite <= med.seuilMin;
            } else if (stockFilter === 'expired') {
                const expDate = med.dateExpiration ? new Date(med.dateExpiration) : null;
                if (expDate) {
                    const daysUntilExpiry = Math.floor((expDate - new Date()) / (1000 * 60 * 60 * 24));
                    matchStock = daysUntilExpiry <= 30;
                } else {
                    matchStock = false;
                }
            }
            
            return matchSearch && matchCategorie && matchStock;
        });
    }

    // Afficher le tableau
    renderTable(filtered = null) {
        const tbody = document.getElementById('tableBody');
        const meds = filtered || this.medicaments;
        
        if (meds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">Aucun médicament trouvé</td></tr>';
            return;
        }

        tbody.innerHTML = meds.map(med => {
            const status = this.getStatus(med);
            const expDate = med.dateExpiration ? new Date(med.dateExpiration).toLocaleDateString('fr-FR') : '-';
            
            return `
                <tr>
                    <td><strong>${med.nom}</strong></td>
                    <td>${med.categorie}</td>
                    <td>${med.quantite} ${med.unite}</td>
                    <td>${med.emplacement || '-'}</td>
                    <td>${expDate}</td>
                    <td><span class="badge ${status.class}">${status.text}</span></td>
                    <td>
                        <button class="action-btn btn-adjust" onclick="manager.adjustQuantity('${med.id}')">±</button>
                        <button class="action-btn btn-edit" onclick="manager.editMedicament('${med.id}')">✏️</button>
                        <button class="action-btn btn-delete" onclick="manager.deleteMedicament('${med.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Mettre à jour les statistiques
    updateStats() {
        const total = this.medicaments.length;
        const lowStock = this.medicaments.filter(m => m.quantite <= m.seuilMin).length;
        
        let expiredSoon = 0;
        const today = new Date();
        this.medicaments.forEach(med => {
            if (med.dateExpiration) {
                const expDate = new Date(med.dateExpiration);
                const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry <= 30) {
                    expiredSoon++;
                }
            }
        });

        document.getElementById('totalMeds').textContent = total;
        document.getElementById('lowStock').textContent = lowStock;
        document.getElementById('expiredSoon').textContent = expiredSoon;
    }

    // Éditer un médicament
    editMedicament(id) {
        const med = this.medicaments.find(m => m.id === id);
        if (!med) return;

        this.currentEditId = id;
        
        document.getElementById('nom').value = med.nom;
        document.getElementById('categorie').value = med.categorie;
        document.getElementById('quantite').value = med.quantite;
        document.getElementById('unite').value = med.unite;
        document.getElementById('seuilMin').value = med.seuilMin;
        document.getElementById('dateExpiration').value = med.dateExpiration || '';
        document.getElementById('emplacement').value = med.emplacement || '';
        document.getElementById('numeroLot').value = med.numeroLot || '';
        
        document.getElementById('btnText').textContent = 'Modifier';
        document.getElementById('medicamentForm').scrollIntoView({ behavior: 'smooth' });
    }

    // Réinitialiser le formulaire
    resetForm() {
        document.getElementById('medicamentForm').reset();
        this.currentEditId = null;
        document.getElementById('btnText').textContent = 'Ajouter';
    }

    // Exporter en CSV
    exportToCSV() {
        const headers = ['Nom', 'Catégorie', 'Quantité', 'Unité', 'Seuil Min', 'Date Expiration', 'Emplacement', 'N° Lot'];
        const rows = this.medicaments.map(m => [
            m.nom,
            m.categorie,
            m.quantite,
            m.unite,
            m.seuilMin,
            m.dateExpiration || '',
            m.emplacement || '',
            m.numeroLot || ''
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock_medicaments_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    // Attacher les événements
    attachEventListeners() {
        // Soumission du formulaire
        document.getElementById('medicamentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = {
                nom: document.getElementById('nom').value,
                categorie: document.getElementById('categorie').value,
                quantite: parseInt(document.getElementById('quantite').value),
                unite: document.getElementById('unite').value,
                seuilMin: parseInt(document.getElementById('seuilMin').value) || 10,
                dateExpiration: document.getElementById('dateExpiration').value,
                emplacement: document.getElementById('emplacement').value,
                numeroLot: document.getElementById('numeroLot').value
            };

            if (this.currentEditId) {
                this.updateMedicament(this.currentEditId, formData);
            } else {
                this.addMedicament(formData);
            }

            this.resetForm();
        });

        // Annulation
        document.getElementById('btnCancel').addEventListener('click', () => {
            this.resetForm();
        });

        // Recherche
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.applyFilters();
        });

        // Filtres
        document.getElementById('filterCategorie').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('filterStock').addEventListener('change', () => {
            this.applyFilters();
        });

        // Export
        document.getElementById('btnExport').addEventListener('click', () => {
            this.exportToCSV();
        });
    }

    applyFilters() {
        const search = document.getElementById('searchInput').value;
        const categorie = document.getElementById('filterCategorie').value;
        const stock = document.getElementById('filterStock').value;
        
        const filtered = this.filterMedicaments(search, categorie, stock);
        this.renderTable(filtered);
    }
}

// Initialisation
const manager = new MedicamentManager();

// Ajouter des données de démonstration (à supprimer en production)
if (manager.medicaments.length === 0) {
    const demoData = [
        {
            nom: 'Paracétamol 500mg',
            categorie: 'Antalgique',
            quantite: 150,
            unite: 'Comprimé',
            seuilMin: 50,
            dateExpiration: '2025-12-31',
            emplacement: 'Armoire A, Étagère 1',
            numeroLot: 'LOT123456'
        },
        {
            nom: 'Amoxicilline 1g',
            categorie: 'Antibiotique',
            quantite: 30,
            unite: 'Boîte',
            seuilMin: 20,
            dateExpiration: '2024-06-30',
            emplacement: 'Réfrigérateur',
            numeroLot: 'LOT789012'
        },
        {
            nom: 'Pansements stériles',
            categorie: 'Pansement',
            quantite: 8,
            unite: 'Boîte',
            seuilMin: 10,
            dateExpiration: '2026-01-15',
            emplacement: 'Armoire B, Étagère 2',
            numeroLot: 'LOT345678'
        }
    ];

    demoData.forEach(med => manager.addMedicament(med));
}