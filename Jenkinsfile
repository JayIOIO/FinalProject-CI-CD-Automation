pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timestamps()
  }

  triggers {
    pollSCM('H/5 * * * *')
  }

  parameters {
    string(
      name: 'ROLLBACK_BUILD',
      defaultValue: '',
      description: 'Optional previous successful build number to redeploy; leave empty for this build.'
    )
  }

  environment {
    COMPOSE_PROJECT_NAME = 'ecomapp-for-system-architecture-main'
    IMAGE_NAMESPACE = 'ecomapp'
    IMAGE_TAG = "${BUILD_NUMBER}"
    DB_NAME = 'ecommerce_db'
    DB_USER = 'app_user'
    DB_PORT = '3306'
    FRONTEND_PORT = '80'
    AUTH_PORT = '4001'
    CATALOG_PORT = '4002'
    ORDER_PORT = '4003'
    DB_PASSWORD = credentials('ecommerce-db-password')
    MYSQL_ROOT_PASSWORD = credentials('ecommerce-mysql-root-password')
    JWT_SECRET = credentials('ecommerce-jwt-secret')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'pwd && ls -la'
      }
    }

    stage('Test') {
      steps {
        sh 'docker compose run --rm --no-deps auth-service npm test'
        sh 'docker compose run --rm --no-deps catalog-service npm test'
        sh 'docker compose run --rm --no-deps order-service npm test'
      }
    }

    stage('Build Images') {
      when {
        expression { params.ROLLBACK_BUILD == '' }
      }
      steps {
        sh 'docker compose --profile test build --pull'
      }
    }

    stage('Integration Test') {
      steps {
        script {
          if (params.ROLLBACK_BUILD && !(params.ROLLBACK_BUILD ==~ /^[0-9]+$/)) {
            error('ROLLBACK_BUILD must be a successful numeric Jenkins build number.')
          }

          def testedTag = params.ROLLBACK_BUILD ? params.ROLLBACK_BUILD : env.BUILD_NUMBER
          withEnv([
            "IMAGE_TAG=${testedTag}",
            "COMPOSE_PROJECT_NAME=ecomapp-ci-${env.BUILD_NUMBER}",
            'FRONTEND_PORT=0'
          ]) {
            try {
              sh 'docker compose up -d --no-build'
              sh 'docker compose --profile test run --rm smoke-test'
            } finally {
              sh 'docker compose down -v --remove-orphans'
            }
          }
        }
      }
    }

    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        script {
          def deployedTag = params.ROLLBACK_BUILD ? params.ROLLBACK_BUILD : env.BUILD_NUMBER
          withEnv(["IMAGE_TAG=${deployedTag}"]) {
            sh 'docker compose up -d --no-build --remove-orphans'
          }
        }
      }
    }

    stage('Smoke Test / Verify') {
      when {
        branch 'main'
      }
      steps {
        script {
          def deployedTag = params.ROLLBACK_BUILD ? params.ROLLBACK_BUILD : env.BUILD_NUMBER
          withEnv(["IMAGE_TAG=${deployedTag}"]) {
            sh 'docker compose exec -T proxy wget -q -O - http://127.0.0.1:8080/api/products >/dev/null'
            sh 'docker compose ps'
          }
        }
      }
    }
  }

  post {
    always {
      echo 'Pipeline finished. Checking deployed services.'
      sh 'docker compose ps || true'
    }
  }
}
