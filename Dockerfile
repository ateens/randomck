FROM nginx:1.27-alpine

ENV PORT=8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY index.html styles.css script.js champion-data.js /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 8080
