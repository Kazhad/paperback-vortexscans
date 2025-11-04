/**
 * Script de post-traitement pour l’extension Paperback.
 * Il ajoute les métadonnées requises en en-tête et supprime les lignes vides.
 */

import fs from "fs"
import path from "path"

const DIST_FILE = path.join("dist", "paperback-vortexscans-0.8.js")

if (!fs.existsSync(DIST_FILE)) {
  console.error("❌ Erreur : fichier dist/paperback-vortexscans-0.8.js introuvable.")
  process.exit(1)
}

// Lecture du code compilé
let code = fs.readFileSync(DIST_FILE, "utf8")

// Supprime les lignes vides inutiles
code = code.replace(/^\\s*$(?:\\r?\\n)/gm, "")

// Ajoute les métadonnées pour Paperback
const metadataBanner = `/**
 * @name VortexScans
 * @version 1.0.0
 * @description Extension Paperback 0.8 pour vortexscans.org
 * @author generated-by-assistant
 * @source https://vortexscans.org
 * @website https://vortexscans.org
 */
`

// Combine la bannière et le code compilé
const finalCode = metadataBanner + "\\n" + code.trim()

// Écrit la version finale
fs.writeFileSync(DIST_FILE, finalCode, "utf8")

console.log("✅ Extension préparée avec succès : dist/paperback-vortexscans-0.8.js")
