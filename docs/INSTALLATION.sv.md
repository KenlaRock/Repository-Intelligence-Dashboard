# Installation på svenska

## Alternativ A — använd den tomma mallen direkt

1. Packa upp ZIP-filen i en vanlig lokal katalog.
2. Installera Node.js 18 eller senare om du vill använda validatorn och den
   lokala webbservern. Själva HTML-appen kräver inte Node.js.
3. Kör `npm run validate`.
4. Kör `npm run serve`.
5. Öppna `http://127.0.0.1:4173/`.
6. Välj **GitHub Live** eller **Lokal repo-root** i appen.

Du kan också öppna `dashboard/index.html` direkt. Localhost rekommenderas
eftersom webbläsarens mappåtkomst fungerar mer förutsägbart i en säker kontext.

## Alternativ B — skapa en förkonfigurerad kopia

```bash
node scripts/install.mjs \
  --output ../min-repo-dashboard \
  --owner exempel-agare \
  --repo exempel-repo \
  --ref main \
  --name "Teamets Repository Dashboard" \
  --init-git
```

Målkatalogen får inte redan finnas. Installeraren har avsiktligt inget
`--force`: en installationsmall ska inte tugga i sig en befintlig katalog bara
för att någon råkade skriva fel sökväg.

Installeraren:

1. kopierar app, instruktioner, validator och hjälpskript;
2. bäddar endast in visningsnamn samt valfri owner/repository/ref;
3. avvisar CLI-parametrar som antyder token, secret eller password;
4. validerar den installerade kopian;
5. kan köra `git init -b main` utan att stagea eller committa filer.

Utelämna `--owner` och `--repo` för en helt tom installation. Om de används
måste båda anges.

## Privat repo

Den nya användaren skapar vid behov en egen fine-grained GitHub-token med
åtkomst endast till aktuellt repo och read-only repository contents/metadata.
Tokenen skrivs in i den körande sidan och ska aldrig läggas i installationskommando,
fil, URL, miljöexempel eller publicerad konfiguration.

## Användning utan Node.js

Öppna `dashboard/index.html` i en Chromium-baserad webbläsare. GitHub-läget
fungerar via GitHub API. Lokal mapp använder File System Access API när det är
tillgängligt och faller annars tillbaka till webbläsarens mappväljare.

## Delning

Skicka den validerade ZIP-filen eller en installerad kopia. Projektet är
open source under MIT-licensen; behåll rotfilen `LICENSE` i kopior eller
väsentliga delar av programvaran. Mallen publicerar eller deployar ingenting
automatiskt.
