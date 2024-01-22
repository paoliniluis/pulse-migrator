# pulse-migrator
This will migrate old Metabase pulses to subscriptions

### How to run
```
NODE_TLS_REJECT_UNAUTHORIZED=0 HOST=<hostname> USERNAME=<username> PASSWORD=<password> bun index.ts
```

### Env vars you need to use
- HOST: the hostname where your Metabase lives
- USERNAME: your username (needs to be an admin)
- PASSWORD: the password of your admin user

If you have SSO enabled and you can't access via user/pass then you can use the env var SESSION_COOKIE, that you can get from your cookies once you authenticated
