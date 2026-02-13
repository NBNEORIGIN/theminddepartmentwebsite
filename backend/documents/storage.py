"""Custom R2 storage backend for Cloudflare R2."""

from storages.backends.s3boto3 import S3Boto3Storage


class R2Storage(S3Boto3Storage):
    """S3-compatible storage for Cloudflare R2."""
    pass
