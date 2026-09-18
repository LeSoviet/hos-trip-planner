from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-pla@%kve1h(%u+cr9=49r5#0bd!w@^o^#virp$#x(tz1)3qdrx'

DEBUG = False

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': False,
        'OPTIONS': {'context_processors': []},
    },
]

WSGI_APPLICATION = 'api.wsgi.application'

DATABASES = {}

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'UNAUTHENTICATED_USER': None,
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': False,
        'OPTIONS': {'context_processors': []},
    },
]

CORS_ALLOWED_ORIGINS = ['http://localhost:5173']
CORS_ALLOW_ALL_ORIGINS = False

MAPBOX_TOKEN = ''
SUPABASE_URL = ''
SUPABASE_SERVICE_ROLE_KEY = ''
FRONTEND_ORIGIN = ''

if FRONTEND_ORIGIN_ENV := __import__('os').environ.get('FRONTEND_ORIGIN'):
    CORS_ALLOWED_ORIGINS = [FRONTEND_ORIGIN_ENV]

MAPBOX_TOKEN = __import__('os').environ.get('MAPBOX_TOKEN', MAPBOX_TOKEN)
SUPABASE_URL = __import__('os').environ.get('SUPABASE_URL', SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY = __import__('os').environ.get('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)