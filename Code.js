function readEmails() {
    // Définition des variables des libellés
    const LABEL_TO_PROCESS = 'JOBS_A_TRAITER';
    const LABEL_PROCESSED = 'JOBS_TRAITES';
        
    // Récupération des emails avec le label spécifié
    const searchString = `label:${LABEL_TO_PROCESS} is:unread`;
    const threads = GmailApp.search(searchString);

    // Récupération des Logs sur les emails trouvés
    Logger.log(`Total de fils de discussion trouvés: ${threads.length}`); // 🔧 Correction: 'lenght' -> 'length'

    if(threads.length === 0) { // 🔧 Correction: 'lenght' -> 'length'
        Logger.log("Aucun email d'offre à traiter.");
        return; // la fonction s'arrête ici si aucun email n'est trouvé
    }

    // Parcours des fils de discussion trouvés
    threads.forEach(thread => {
        // Renommage en 'message' pour plus de clarté (car c'est un objet unique)
        const message = thread.getMessages().pop(); 
        
        // Les logs basiques restent ici pour le suivi
        const Titre = message.getSubject();
        const ID_Message = message.getId();

        Logger.log(`--- Début du traitement : ${Titre} ---`);
        Logger.log(`ID du Message : ${ID_Message}`);

        // La fonction processJobOffer DOIT être définie ailleurs dans le script.
        const data = processJobOffer(message);
        //processJobOffer(message);
        writeToSheet(data);

    });
}

function processJobOffer(message) {
    const fullSubject = message.getSubject(); 
    const bodyHTML = message.getBody(); 
    const ID_Message = message.getId();
    
    let extractedData = null;

    if (fullSubject.includes("HelloWork") || fullSubject.match(/\(.*\)/)) {
        // HelloWork (Format : (Poste - Lieu - Contrat))
        extractedData = parseHelloWork(fullSubject, bodyHTML, ID_Message);
        
    } else if (fullSubject.includes("recherche un/e") || fullSubject.includes("nouvelles offres")) {
        // Indeed (Format : [Entreprise] recherche [Poste]...)
        extractedData = parseIndeed(fullSubject, bodyHTML, ID_Message);

    } else if (fullSubject.includes("LinkedIn")) {
        // LinkedIn (À développer)
        extractedData = parseLinkedIn(fullSubject, bodyHTML, ID_Message);
        
    } else {
        Logger.log(`[ERREUR DÉTECTION] Source non reconnue : ${fullSubject}`);
    }
    
    // Si des données ont été extraites, la fonction readEmails les utilisera.
    return extractedData; 
}
function parseHelloWork(subject, htmlBody, id) {
    Logger.log("[PARSING] Tentative de parsing HelloWork...");

    // 🎯 CORRECTION: Utiliser le RegExp de SUJET pour extraire les données
    const hwSubjectRegex = /\((.+?)\s*-\s*(.+?)\s*-\s*(.+?)\)/i;
    const match = subject.match(hwSubjectRegex);

    let Titre = subject.trim();
    let Lieu = 'Non spécifié';
    let Contrat = 'Non spécifié';
    let Entreprise = 'Non spécifié';
    
    if (match) {
        Titre = match[1].trim();     
        Lieu = match[2].trim();       
        Contrat = match[3].trim();    
    }
    
    // --- Recherche de l'Entreprise dans le corps HTML --- (Logique OK)
    const companyInBodyRegex = /(Entreprise|Société|Recruteur)[^>:]*[:>]?\s*([^<]+)/i;
    const companyMatch = htmlBody.match(companyInBodyRegex);

    if (companyMatch && companyMatch[2]) {
        Entreprise = companyMatch[2].trim().replace(/\s{2,}/g, ' '); 
    }
    
    // --- Correction de l'Extraction du Lien (Nécessite extractJobLink) ---
    // Utilisation de la nouvelle fonction robuste
    let Lien_Offre = extractJobLink(htmlBody, 'hellowork.com'); 
    
    return { Titre, Entreprise, Lieu, Lien: Lien_Offre, ID: id, Contrat };
}

/**
 * Extrait les données d'une alerte Indeed.
 * L'Entreprise, le Titre et le Lieu sont extraits du Sujet.
 */
function parseIndeed(subject, htmlBody, id) {
    Logger.log("[PARSING] Tentative de parsing Indeed...");
    
    // 🎯 CORRECTION: Utiliser le RegExp de SUJET pour extraire les données
    const indeedSubjectRegex = /([^,]+?)\srecherche\s(un\/e|un|une)\s(.+?)\s+à\s+([^,]+?)\s+\+ \d+\s+nouvelles offres/i;
    const match = subject.match(indeedSubjectRegex);

    let Titre = subject.trim();
    let Entreprise = 'Non spécifié';
    let Lieu = 'Non spécifié';
    let Contrat = 'Non spécifié';
    
    if (match) {
        Entreprise = match[1].trim(); // Groupe 1: Septeo
        Titre = match[3].trim();      // Groupe 3: Technicien informatique...
        Lieu = match[4].trim();       // Groupe 4: toulouse (31)
    }
    
    // --- Correction de l'Extraction du Lien (Nécessite extractJobLink) ---
    // Utilisation de la nouvelle fonction robuste
    let Lien_Offre = extractJobLink(htmlBody, 'indeed.com'); 
    
    // Ajout de logs pour vérification immédiate du résultat
    Logger.log(`[Indeed] Titre: ${Titre}, Entreprise: ${Entreprise}, Lieu: ${Lieu}, Lien: ${Lien_Offre}`);
    
    return { Titre, Entreprise, Lieu, Lien: Lien_Offre, ID: id, Contrat };
}

/* Extrait les données d'une alerte LinkedIn.
 * ACTUELLEMENT, le parsing est générique en attendant le pattern LinkedIn.
 */
function parseLinkedIn(subject, htmlBody, id) {
    Logger.log("[PARSING] Tentative de parsing LinkedIn...");
    
    // 🎯 CORRECTION: Le RegExp de Sujet LinkedIn doit être défini ici.
    // Laissez-le à null en attendant votre exemple de sujet.
    const linkedInSubjectRegex = null; // A REMPLACER
    const match = subject.match(linkedInSubjectRegex);
    
    let Titre = subject.trim();
    // ... (Reste de l'extraction des données) ...
    
    // --- Correction de l'Extraction du Lien (Nécessite extractJobLink) ---
    let Lien_Offre = extractJobLink(htmlBody, 'linkedin.com'); 
    
    // ... (Reste du retour) ...
    return { Titre, Entreprise, Lieu, Lien: Lien_Offre, ID: id, Contrat };
}
    
    // --- Extraction du Lien (Identique) ---
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const foundUrls = htmlBody.match(urlRegex);
    if (foundUrls && foundUrls.length > 0) {
      Lien_Offre = foundUrls[0]; 
    }
    
    Logger.log(`[LinkedIn] Titre: ${Titre}, Entreprise: ${Entreprise}, Lieu: ${Lieu}, Lien: ${Lien_Offre}`);
    
    return { Titre, Entreprise, Lieu, Lien: Lien_Offre, ID: id, Contrat };
}

/**
 * Ouvre le Google Sheet et ajoute une nouvelle ligne de données extraites.
 * Cette fonction doit être appelée par processJobOffer(message).
 * @param {Object} data Un objet contenant les données à écrire (Titre, Lien, Entreprise, Lieu, ID).
 */
function writeToSheet(data) {
  
  // 1. Définition des constantes
  const SPREADSHEET_ID = '1WAGDvsVTdlPxw1KvN_I9SCdJ9Ogg34cVm7Busj_OsCM'; 
  const SHEET_NAME = 'Dashboard'; 

  try {
    // 2. Initialisation du Spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dashboardSheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Vérification de la feuille (utilisons le nom de la variable corrigé : dashboardSheet)
    if (!dashboardSheet) {
      Logger.log(`Erreur : La feuille nommée '${SHEET_NAME}' n'a pas été trouvée.`);
      return;
    }

    // 3. Création du tableau de données dans l'ordre EXACT des colonnes (A à J)
    const rowData = [
      data.Titre,              // Colonne A 
      data.Entreprise,         // Colonne B 
      data.Lieu,               // Colonne C 
      data.Lien,               // Colonne D 
      new Date(),              // Colonne E : Date_Publi (Date actuelle)
      '',                      // Colonne F : Score (Laissé vide)
      'À Traiter',             // Colonne G : Statut 
      '',                      // Colonne H : Date_Candidature
      '',                      // Colonne I : Date_Relance
      data.ID                  // Colonne J : ID_Message
    ];

    // 4. Écriture de la nouvelle ligne
    dashboardSheet.appendRow(rowData);
    Logger.log(`Ligne ajoutée avec succès pour le Titre: ${data.Titre}`);

  } catch (e) {
    Logger.log(`Erreur lors de l'écriture dans la feuille : ${e}`);
  }
}