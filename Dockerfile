# ============================================
# ÉTAPE 1 : Build Angular avec Node
# ============================================
FROM node:18-alpine AS build

WORKDIR /app

# Copier package.json + yarn.lock pour le cache
COPY package.json yarn.lock* package-lock.json* ./

# Installer les dépendances
RUN npm install --legacy-peer-deps

# Copier tout le projet
COPY . .

# Builder l'app Angular en mode production
RUN npm run build

# ============================================
# ÉTAPE 2 : Servir avec Nginx
# ============================================
FROM nginx:alpine

# Supprimer la config Nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier ta config Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build Angular vers Nginx
# Angular 16 met le build dans dist/<nom-projet>/
# Pour ng-matero c'est dist/ng-matero/
COPY --from=build /app/dist/attendance-management /usr/share/nginx/html

# Nginx écoute sur le port 80
EXPOSE 80

# Lancer Nginx
CMD ["nginx", "-g", "daemon off;"]
