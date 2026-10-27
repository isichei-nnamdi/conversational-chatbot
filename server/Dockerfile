FROM node:22-alpine
ENV NODE_ENV=production PORT=7860
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
COPY data ./data
USER node
EXPOSE 7860
CMD ["node", "src/index.js"]
