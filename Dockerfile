# ============================================
# Servir le build Angular avec Nginx
# (Le build Angular est déjà fait par Jenkins avant cette étape)
# ============================================
FROM nginx:alpine

# Supprimer la config Nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier la config Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build Angular produit par Jenkins
COPY dist/attendance-management /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]