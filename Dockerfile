FROM python:3.12-alpine
COPY deploy-app/ /app/
WORKDIR /app
EXPOSE 8080
CMD ["python3", "server.py"]
