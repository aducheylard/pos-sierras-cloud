FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Instalar dependencias
COPY package.json .
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]