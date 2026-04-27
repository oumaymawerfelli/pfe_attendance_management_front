pipeline {
    agent any

    tools {
        nodejs 'Node18'
    }

    environment {
        IMAGE_NAME = 'mon-frontend'
    }

    stages {

        stage('1️ Checkout') {
            steps {
                echo ' Récupération du code Angular depuis GitHub...'
                checkout scm
            }
        }

        stage('2️ Vérifier Node') {
            steps {
                echo ' Vérification de Node.js et npm...'
                sh 'node --version'
                sh 'npm --version'
            }
        }

        stage('3️ Install dependencies') {
            steps {
                echo ' Installation des dépendances npm...'
                sh 'npm install --legacy-peer-deps'
            }
        }

        stage('4️Lint (optionnel)') {
            steps {
                echo ' Linter le code...'
                sh 'npm run lint:ts || true'
            }
        }

        stage('5️ Build Angular') {
            steps {
                echo ' Build du frontend...'
                sh 'npm run build'
            }
        }

        stage('6️ Archive build') {
            steps {
                echo ' Archivage du build Angular...'
                archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
            }
        }

        stage('7️ Docker Build') {
            steps {
                echo ' Construction de l image Docker...'
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('8️ Vérification') {
            steps {
                echo ' Vérification de l image Docker...'
                sh "docker images | grep ${IMAGE_NAME}"
            }
        }
    }

    post {
        success {
            echo '''
             ===============================
               PIPELINE FRONTEND RÉUSSI !
               Image: mon-frontend:latest
            ================================='''
        }
        failure {
            echo ' PIPELINE ÉCHOUÉ - voir les logs'
        }
        always {
            echo ' Pipeline terminé'
        }
    }
}