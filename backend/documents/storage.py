"""Custom R2 storage backend that disables SSL verification to work around
Cloudflare R2 TLS handshake failures on certain Python/OpenSSL versions."""

from storages.backends.s3boto3 import S3Boto3Storage


class R2Storage(S3Boto3Storage):
    def _create_client(self):
        """Override to inject verify=False into the boto3 client config."""
        from botocore.config import Config
        # Get existing config or create new one
        config = self.config or Config()
        # Merge with signature_version
        config = config.merge(Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'},
        ))
        self._client = self.connection.meta.client
        return self._client

    @property
    def connection(self):
        """Override connection property to pass verify=False to the session."""
        if hasattr(self, '_connection') and self._connection is not None:
            return self._connection

        import boto3
        from botocore.config import Config

        session = boto3.session.Session()
        config = Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'},
        )
        self._connection = session.resource(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region_name or 'auto',
            config=config,
            verify=False,
        )
        return self._connection
