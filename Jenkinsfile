pipeline {
  agent any

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
  }

  stages {
    stage('Checkout') {
      steps {
        echo 'Checking out source code'
        sh 'pwd && ls -la'
      }
    }

    stage('Test') {
      steps {
        echo 'Running static and build checks'
        sh 'docker compose -f $COMPOSE_FILE run --rm auth-service node --check server.js'
        sh 'docker compose -f $COMPOSE_FILE run --rm catalog-service node --check server.js'
        sh 'docker compose -f $COMPOSE_FILE run --rm order-service node --check server.js'
        sh 'docker compose -f $COMPOSE_FILE run --rm frontend npm run build'
      }
    }

    stage('Build Images') {
      steps {
        echo 'Building Docker images for all services'
        sh 'docker compose -f $COMPOSE_FILE build --pull'
      }
    }

    stage('Deploy') {
      steps {
        echo 'Deploying the multi-container application stack'
        sh 'docker compose -f $COMPOSE_FILE up -d --no-build'
      }
    }

    stage('Smoke Test / Verify') {
      steps {
        echo 'Verifying the application is available through the proxy'
        sh 'curl -fsS http://localhost/api/products >/dev/null'
      }
    }
  }

  post {
    always {
      echo 'Pipeline finished. Checking running services.'
      sh 'docker compose -f $COMPOSE_FILE ps || true'
    }
  }
}
