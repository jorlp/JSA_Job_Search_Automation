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
/**
function processJobOffer(message) {

        const Titre = message.getSubject();
        const ID_Message = message.getId();
        const bodyText = message.getPlainBody();
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundUrls = bodyText.match(urlRegex);

        let Lien_Offre = 'Lien non trouvé';

        if (foundUrls && foundUrls.length > 0) {
          Lien_Offre = foundUrls[0];
        }

        Logger.log(`[INFOS BASE] Titre : ${Titre}`);
        Logger.log(`[EXTRACTION] Lien de l'offre extrait: ${Lien_Offre}`);
      
      return {
        Titre: Titre,
        Lien: Lien_Offre,
        ID: ID_Message,
        Body: bodyText
      };
      
      }
       */
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

    const hwRegex = /https:\/\/emails\.hellowork\.com\/clic\/[a-f0-9\-]+\/\d+\/[a-f0-9]+\/[a-z0-9\.]+@[a-z0-9\-]+\.[a-z]+\/[a-zA-Z0-9\-]+(?:%[0-9a-f]{2})*/i;
    const match = subject.match(hwRegex);

    let Titre = subject.trim();
    let Lieu = 'Non spécifié';
    let Contrat = 'Non spécifié';
    let Entreprise = 'Non spécifié';
    let Lien_Offre = 'Lien non trouvé';

    if (match) {
        Titre = match[1].trim();     
        Lieu = match[2].trim();       
        Contrat = match[3].trim();    
    }
    
    // --- Recherche de l'Entreprise dans le corps HTML ---
    // Cette partie nécessite votre test de RegExp ciblé !
    const companyInBodyRegex = /(Entreprise|Société|Recruteur)[^>:]*[:>]?\s*([^<]+)/i;
    const companyMatch = htmlBody.match(companyInBodyRegex);

    if (companyMatch && companyMatch[2]) {
        Entreprise = companyMatch[2].trim().replace(/\s{2,}/g, ' '); 
    }
    
    // --- Extraction du Lien ---
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const foundUrls = htmlBody.match(urlRegex);
    if (foundUrls && foundUrls.length > 0) {
      Lien_Offre = foundUrls[0]; 
    }
    
    return { Titre, Entreprise, Lieu, Lien: Lien_Offre, ID: id, Contrat };
}

/**
 * Extrait les données d'une alerte Indeed.
 * L'Entreprise, le Titre et le Lieu sont extraits du Sujet.
 */
function parseIndeed(subject, htmlBody, id) {
    Logger.log("[PARSING] Tentative de parsing Indeed...");
    
    // 🎯 CORRECTION : Utiliser le pattern Indeed pour le sujet
    const indeedRegex = /https?:\/\/fr\.indeed\.com\/rc\/clk\/dl\?jk=[a-zA-Z0-9]+&from=ja&qd=[^&]+&rd=[^&]+&tk=[a-zA-Z0-9]+&alid=[a-zA-Z0-9]+&bb=[^&]+&g1tAS=true/i;
    const match = subject.match(indeedRegex);

    let Titre = subject.trim();
    let Entreprise = 'Non spécifié';
    let Lieu = 'Non spécifié';
    let Contrat = 'Non spécifié'; // Indeed ne fournit pas cette info dans le sujet
    let Lien_Offre = 'Lien non trouvé';

    if (match) {
        // Le pattern Indeed capture :
        Entreprise = match[1].trim(); // Groupe 1: Septeo
        Titre = match[3].trim();      // Groupe 3: Technicien informatique...
        Lieu = match[4].trim();       // Groupe 4: toulouse (31)
    } else {
        // Si le pattern n'est pas reconnu (e.g., autre format Indeed), on laisse le sujet comme Titre par défaut.
        Titre = subject.trim();
    }
    
    // --- Extraction du Lien (Identique) ---
    // Le lien est toujours dans le corps HTML
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const foundUrls = htmlBody.match(urlRegex);
    if (foundUrls && foundUrls.length > 0) {
      Lien_Offre = foundUrls[0]; 
    }
    
    // Ajout de logs pour vérification immédiate du résultat
    Logger.log(`[Indeed] Titre: ${Titre}, Entreprise: ${Entreprise}, Lieu: ${Lieu}, Lien: ${Lien_Offre}`);
    
    return { Titre, Entreprise, Lieu, Lien: Lien_Offre, ID: id, Contrat };
}

/* Extrait les données d'une alerte LinkedIn.
 * ACTUELLEMENT, le parsing est générique en attendant le pattern LinkedIn.
 */
function parseLinkedIn(subject, htmlBody, id) {
    // 1. Correction du log
    Logger.log("[PARSING] Tentative de parsing LinkedIn...");
    
    // 2. Variable générique (à remplacer par le pattern LinkedIn)
    // Le pattern est actuellement désactivé car il est celui d'Indeed.
    const linkedInRegex = /https:\/\/www\.linkedin\.com\/comm\/jobs\/view\/\d+\/\?trackingId=[\w%]+&refId=[\w%]+&lipi=[\w%]+&midToken=[\w-]+&midSig=[\w-]+&trk=[\w-]+&trkEmail=[\w-]+&eid=[\w-]+&otpToken=[\w%]+/i;
    const match = subject.match(linkedInRegex); // Va retourner null pour l'instant
    

    let Titre = subject.trim();
    let Entreprise = 'Non spécifié';
    let Lieu = 'Non spécifié';
    let Contrat = 'Non spécifié'; 
    let Lien_Offre = 'Lien non trouvé';

    if (match) {
        // Cette section sera remplie une fois que nous aurons le pattern LinkedIn
        Entreprise = match[1].trim(); 
        Titre = match[2].trim(); 
        Lieu = match[3].trim(); 
    } else {
        // En cas d'échec du parsing, on fait une tentative pour trouver l'Entreprise dans le corps HTML
        const companyInBodyRegex = /(Entreprise|Société|Recruteur)[^>:]*[:>]?\s*([^<]+)/i;
        const companyMatch = htmlBody.match(companyInBodyRegex);

        if (companyMatch && companyMatch[2]) {
            Entreprise = companyMatch[2].trim().replace(/\s{2,}/g, ' '); 
        }
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