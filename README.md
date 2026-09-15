# PoliMi Study Plan Builder — Computer Science & Engineering (T2A)

Una web application interattiva, moderna e reattiva per pianificare, verificare e personalizzare il piano di studi della **Laurea Magistrale in Computer Science and Engineering - Ingegneria Informatica (542)** presso il **Politecnico di Milano** (Orientamento **T2A** — Anno Accademico **2026/2027**, 2° Anno).

---

## ✨ Caratteristiche Principali

- **Verifica Vincoli in Tempo Reale**:
  - Dashboard di convalida automatica per tutte le **8 regole curriculari del piano T2A** (D.M. 1648-1649/23 e Regolamento di Corso):
    1. **120 CFU Totali**: controllo CFU effettivi tra esami superati e pianificati.
    2. **8 Insegnamenti Obbligatori T2A**: inclusione dei corsi obbligatori (con supporto per esami già sostenuti al I livello).
    3. **Gruppo INT1**: almeno 15 CFU.
    4. **Tabella A (TABA)**: almeno 45 CFU di insegnamenti caratterizzanti.
    5. **Tabella A + Tabella B (TABA + TABB)**: almeno 55 CFU complessivi.
    6. **Gruppo DOT & Soft Skills**: al massimo 1 insegnamento effettivo (gli altri gestibili come sovrannumero).
    7. **Gruppo Etica, Progetto, Diritto & Robotics**: al massimo 2 insegnamenti effettivi.
    8. **Intelligenza Artificiale**: al massimo 3 insegnamenti effettivi.
- **Catalogo Completo Insegnamenti Ufficiali**:
  - Oltre 390 insegnamenti e regole di orientamento estratti direttamente dal Manifesto degli Studi ufficiale per l'A.A. 2026/2027.
  - Link diretti e funzionanti alla scheda dettagliata del programma sul portale ufficiale del Politecnico di Milano.
  - Insegnamento opzionale `Theoretical Computer Science` (5 CFU, 1° semestre) incluso nella sezione dedicata.
- **Gestione Stato Insegnamenti & Note Personali**:
  - Stati selezionabili: `Pianificato (Nel Piano)`, `Superato (Verbalizzato)`, `In Sovrannumero (Extra)`, `Sostenuto al I Livello`, `In Valutazione`, `Escluso`.
  - Salvataggio automatico persistente in `localStorage` e precaricamento del piano di studi predefinito.
  - Campo per annotazioni personali per ogni singolo insegnamento.
- **Motore di Ricerca e Filtri Avanzati**:
  - Ricerca istantanea full-text per nome corso, codice o SSD.
  - Filtri per semestre (1°, 2°, Annuale), per vincolo (INT1, TABA, TABB, Obbligatori, DOT, Limit 2, Limit 3 AI) e per stato.
  - Filtro rapido per visualizzare esclusivamente i corsi presenti nel proprio piano.
  - Funzione Comprimi / Espandi per tutte le sezioni o singola tabella.
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
  - Nessun overflow orizzontale della pagina.
- **Integrazione PoliNetwork**:
  - Collegamento diretto a [PoliNetwork](https://beta.polinetwork.org/) per trovare velocemente i gruppi Telegram degli insegnamenti e della community.

---

## 📁 Struttura del Progetto

```
uni-plan/
├── index.html                  # Pagina principale dell'applicazione
├── README.md                   # Documentazione del progetto
├── css/
│   └── styles.css              # Stili CSS, tema PoliMi e regole responsive
├── js/
│   ├── app.js                  # Logica interfaccia, gestione stato, tabelle e filtri
│   └── validation.js           # Motore di validazione vincoli e insiemi di codici T2A
└── data/
    ├── Manifesti_degli_Studi.html  # Dump HTML ufficiale scaricato dal portale PoliMi
    ├── manifesto_data.js       # Dati strutturati degli insegnamenti (modulo JS per frontend)
    ├── manifesto_data.json     # Dati strutturati degli insegnamenti (formato JSON)
    └── study-plan-state.json   # Stato iniziale / predefinito del piano di studi
```

---

## 🚀 Come Utilizzare il Progetto

L'applicazione è puramente client-side (HTML5, CSS3, Vanilla JavaScript), senza dipendenze esterne o build step.

### Apertura Diretta
Puoi aprire direttamente il file [`index.html`](file:///home/berto/uni-plan/index.html) in qualsiasi browser web moderno (Chrome, Firefox, Safari, Edge).

### Avvio con Server Locale (Consigliato)
Per testare la persistenza e il caricamento asincrono del piano salvato, puoi avviare un server locale leggero:

```bash
# Con Python 3
python3 -m http.server 8080

# Oppure con Node.js (npx)
npx serve .
```

Apri quindi [http://localhost:8080](http://localhost:8080) nel tuo browser.

---

## ⚙️ Regole di Validazione del Piano T2A

I vincoli implementati in [`js/validation.js`](file:///home/berto/uni-plan/js/validation.js) riflettono accuratamente il regolamento didattico per l'orientamento T2A:

| Vincolo | Requisito | Note |
|---|---|---|
| **Totale CFU** | 120 CFU | Somma di insegnamenti pianificati e superati |
| **Insegnamenti Obbligatori** | 8/8 | 7 esami di base + Prova Finale (20 CFU); se sostenuti in triennale si impostano come *Sostenuto al I Livello* |
| **Gruppo INT1** | Minimo 15 CFU | Insegnamenti a scelta interdisciplinari |
| **Tabella A** | Minimo 45 CFU | Insegnamenti caratterizzanti informatici |
| **Tabella A + B** | Minimo 55 CFU | Con almeno 45 CFU da Tabella A |
| **Gruppo DOT & Soft Skills** | Massimo 1 corso | Corsi di Dottorato e Soft Skills (eccedenze vanno in sovrannumero) |
| **Etica, Progetto & Diritto** | Massimo 2 corsi | Include anche Robotica Autonoma (eccedenze in sovrannumero) |
| **Intelligenza Artificiale** | Massimo 3 corsi | Corsi dell'area Machine Learning / AI (max 3 effettivi) |

---

## 📄 Licenza

Progetto distribuito per uso personale e accademico. Dati dei corsi estratti dall'offerta didattica ufficiale del Politecnico di Milano.
