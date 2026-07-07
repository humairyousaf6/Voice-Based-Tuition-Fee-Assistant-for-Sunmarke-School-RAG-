import https from 'node:https';
import tls from 'node:tls';

type TlsWithSystemCa = typeof tls & {
    getCACertificates?: (type?: 'default' | 'bundled' | 'system' | 'extra') => string[];
    setDefaultCACertificates?: (certificates: string[]) => void;
};

const tlsWithSystemCa = tls as TlsWithSystemCa;

const defaultCertificates = [
    ...(tlsWithSystemCa.getCACertificates?.('bundled') || []),
    ...(tlsWithSystemCa.getCACertificates?.('system') || []),
    ...(tlsWithSystemCa.getCACertificates?.('extra') || []),
];

const uniqueCertificates = Array.from(new Set(defaultCertificates));

tlsWithSystemCa.setDefaultCACertificates?.(uniqueCertificates);

export const httpsAgent = new https.Agent({
    ca: uniqueCertificates,
    keepAlive: true,
});
