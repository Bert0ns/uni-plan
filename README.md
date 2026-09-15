# 🎓 PoliMi T2A — Web App Interattiva Manifesto degli Studi & Gestione Piano di Studi

[![Politecnico di Milano](https://img.shields.io/badge/PoliMi-Ingegneria%20Informatica%20(T2A)-003366?style=for-the-badge)](https://www.polimi.it/)
[![A.A. 2026/2027](https://img.shields.io/badge/Anno%20Accademico-2026%2F2027-0284c7?style=for-the-badge)](https://onlineservices.polimi.it/manifesti/manifesti/controller/ManifestoPublic.do?EVN_DETTAGLIO_RIGA_MANIFESTO=evento&k_cf=225&k_corso_la=542&k_indir=T2A&aa=2026)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

Una web application interattiva, moderna e reattiva per pianificare, verificare e gestire il piano di studi per la **Laurea Magistrale in Computer Science and Engineering (Ingegneria Informatica — Pista T2A)** del **Politecnico di Milano** per l'Anno Accademico **2026/2027**.

---

## ✨ Funzionalità Principali

- **Verifica Automatica di Tutti i Vincoli T2A (Manifesto PoliMi)**:
  - Totale CFU complessivi (target: 120 CFU).
  - 8 Insegnamenti Obbligatori (45 CFU) verificati puntualmente.
  - Tabella A — Insegnamenti Caratterizzanti (almeno 45 CFU).
  - Tabella A + Tabella B (almeno 55 CFU complessivi).
  - Gruppo INT1 — Corsi Interdisciplinari (almeno 15 CFU).
  - Vincolo Intelligenza Artificiale (massimo 3 insegnamenti / 15 CFU).
  - Vincolo Etica, Progetto, Diritto e Robotics (massimo 2 insegnamenti / 10 CFU).
  - Vincolo Tabelle DOT e Soft Skills (massimo 1 insegnamento / 2.5-5 CFU).
- **Gestione Stato Corsi & Note Personali**:
  - Stati selezionabili: `Pianificato (Nel Piano)`, `Superato (Verbalizzato)`, `In Sovrannumero (Extra)`, `Sostenuto al I Livello`, `In Valutazione`, `Escluso`.
  - Salvataggio automatico persistente in `localStorage` e precaricamento del piano di studi predefinito.
  - Campo per annotazioni personali per ogni singolo insegnamento.
- **Motore di Ricerca e Filtri Concorrenti Avanzati**:
  - **Filtri Concorrenti Simultanei**: combina contemporaneamente ricerca full-text, Anno di corso (1° o 2° anno), vincoli T2A (Obbligatori, Tabella A, Tabella B, INT1, AI, Etica/Proj, DOT/Soft), Semestre (1°, 2°, Annuale), Stato nel Piano (Nel Piano, Non nel Piano, Pianificato, Superato, Sovrannumero, I Livello, Con Note, ecc.), CFU (5.0, 10.0, altri) e Lingua (🇬🇧 EN, 🇮🇹 IT) in un'unica valutazione logica concorrente (AND tra dimensioni, unione multi-selezione tra vincoli).
  - **Selezione Multipla dei Vincoli**: possibilità di attivare più vincoli curriculari in parallelo (es. Tabella A + INT1) con visualizzazione unificata.
  - **UI Uniforme & Chip Interattivi**: barra comandi standardizzata con palette semantica elegante, indicatori di stato attivi (✓), chip dismissibili con rimozione selettiva con un clic (✕) e pulsante di ripristino istantaneo (*Reset Filtri* con contatore filtri attivi).
  - **Stato Vuoto Dedicato & Conteggi in Tempo Reale**: card di feedback amichevole quando nessun corso corrisponde alla combinazione di filtri e badge di corrispondenza per ogni singola tabella (*X / Y visibili*).
  - **Sincronizzazione Completa**: il pulsante *★ Nel Mio Piano* nella barra di navigazione superiore, la pill rapida e il selettore di stato rimangono perfettamente sincronizzati in tempo reale.
  - **Funzione Comprimi / Espandi**: espandi o comprimi tutte le sezioni o singola tabella con un clic.
- **Esportazione & Importazione Dati (File JSON)**:
  - Esporta il piano di studi completo (stati, CFU e note) scaricando un file `.json` pronto per il backup o copiandolo negli appunti.
  - Importa qualsiasi salvataggio precedente tramite Drag & Drop (sull'intera schermata o nell'area dedicata), selettore file o incollando direttamente il codice JSON.
  - Normalizzazione e validazione intelligente: supporta dizionari, liste di corsi, oggetti nidificati e sinonimi di stato.
- **Persistenza & Caching Locale nel Browser**:
  - Salvataggio automatico persistente in `localStorage` ad ogni modifica di stato o inserimento di note personali (con salvataggio automatico preventivo alla chiusura della scheda).
  - Indicatore visivo dello stato di salvataggio in tempo reale nella barra superiore.
  - Sincronizzazione automatica tra più schede del browser aperte in contemporanea.
  - Opzioni per il ripristino del piano predefinito o l'azzeramento completo.
- **Design Ottimizzato per Mobile e Tablet**:
  - Layout responsive fluido con colonna Codice fissa (`sticky`) per scorrere comodamente le tabelle su smartphone senza perdere l'orientamento.
  - Prevenzione dell'auto-zoom su dispositivi iOS e touch targets ampi conformi agli standard di usabilità.
  - Scorrimento orizzontale morbido per i filtri rapidi con indicatori di sfumatura visiva.

---

## 🚀 Utilizzo

1. Apri `index.html` in qualsiasi browser web moderno (Chrome, Firefox, Safari, Edge) oppure avvia un server locale:
   ```bash
   python3 -m http.server 8080
   # quindi visita http://localhost:8080
   ```
2. **Personalizza il tuo piano**:
   - Cambia lo stato dei corsi tra *Nel Piano*, *Superato*, *Sovrannumero*, *I Livello*, ecc.
   - Aggiungi note personali su docenti, orari, propedeuticità o scadenze.
3. **Monitora i vincoli**:
   - La barra superiore e il riquadro di riepilogo indicano in tempo reale lo stato di soddisfacimento di tutti i requisiti della pista T2A.
4. **Esporta e sincronizza**:
   - Salva un backup in locale del tuo piano cliccando su **Esporta** o trascina un backup precedente per ripristinarlo al volo.

---

## 🛠️ Stack Tecnologico

- **HTML5 Semantico** e accessibile.
- **CSS3 Moderno**: CSS Variables (Design Tokens), Flexbox, CSS Grid, Sticky columns, Media Queries per mobile/tablet/desktop.
- **Vanilla JavaScript (ES6+)**: Reattivo, leggero, privo di dipendenze esterne pesanti o framework obbligatori.
- **LocalStorage API**: Persistenza istantanea offline-first senza necessità di database o server remoti.

---

## 📄 Licenza

Rilasciato sotto licenza [MIT](LICENSE).
Manifesto degli Studi e dati didattici © [Politecnico di Milano](https://www.polimi.it/).
