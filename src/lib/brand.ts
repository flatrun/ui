import type { Deployment, Service } from "@/types";

// Matched against the image's own name, with registry, namespace and tag removed.
const LOGOS: [RegExp, string][] = [
  [/^(nginx|openresty)/, "logos:nginx"],
  [/^(httpd|apache)/, "logos:apache"],
  [/^mysql/, "logos:mysql-icon"],
  [/^mariadb/, "logos:mariadb-icon"],
  [/^(postgres|postgis|pgvector|timescaledb)/, "logos:postgresql"],
  [/^valkey/, "logos:valkey"],
  [/^(redis|keydb|dragonfly)/, "logos:redis"],
  [/^mongo/, "logos:mongodb-icon"],
  [/^sqlite/, "logos:sqlite"],
  [/^(elasticsearch|opensearch)/, "logos:elasticsearch"],
  [/^meilisearch/, "logos:meilisearch"],
  [/^memcached/, "logos:memcached"],
  [/^rabbitmq/, "logos:rabbitmq-icon"],
  [/^(kafka|cp-kafka|redpanda)/, "logos:kafka-icon"],
  [/^nats/, "logos:nats-icon"],
  [/^influxdb/, "logos:influxdb-icon"],
  [/^couchdb/, "logos:couchdb-icon"],
  [/^node/, "logos:nodejs-icon"],
  [/^bun$/, "logos:bun"],
  [/^deno/, "logos:deno"],
  [/^django/, "logos:django-icon"],
  [/^(python|pypy)/, "logos:python"],
  [/^laravel/, "logos:laravel"],
  [/^(php(?!myadmin)|composer)/, "logos:php"],
  [/^wordpress/, "logos:wordpress-icon"],
  [/^ghost/, "logos:ghost"],
  [/^nextjs|^next$/, "logos:nextjs-icon"],
  [/^nuxt/, "logos:nuxt-icon"],
  [/^astro/, "logos:astro-icon"],
  [/^golang|^go$/, "logos:go"],
  [/^rust/, "logos:rust"],
  [/^(openjdk|eclipse-temurin|amazoncorretto|java)/, "logos:java"],
  [/^rails/, "logos:rails"],
  [/^ruby/, "logos:ruby"],
  [/^grafana/, "logos:grafana"],
  [/^prometheus/, "logos:prometheus"],
  [/^n8n/, "logos:n8n-icon"],
  [/^vault|^openbao/, "logos:vault-icon"],
  [/^consul/, "logos:consul"],
  [/^strapi/, "logos:strapi-icon"],
  [/^hasura|^graphql-engine/, "logos:hasura-icon"],
  [/^(docker|dind)/, "logos:docker-icon"],
];

// Images with no brand logo still say what they do.
const KINDS: [RegExp, string][] = [
  [/^(minio|seaweedfs|garage)/, "container"],
  [/^(caddy|traefik|haproxy|envoy)/, "globe"],
  [/^(mailhog|mailpit|postfix|maddy)/, "mail"],
  [/^(phpmyadmin|adminer|pgadmin)/, "table"],
  [/^(busybox|alpine|debian|ubuntu)/, "terminal"],
];

const DATA =
  /^(mysql|mariadb|postgres|postgis|pgvector|timescaledb|redis|valkey|keydb|dragonfly|mongo|memcached|couchdb|influxdb|elasticsearch|opensearch|meilisearch|rabbitmq|kafka|nats|minio)/;

function imageName(image: string | undefined): string {
  const repo = (image ?? "").toLowerCase().split("@")[0];
  const last = repo.split("/").pop() ?? "";
  return last.split(":")[0];
}

export function serviceIcon(image: string | undefined): string {
  const name = imageName(image);
  return LOGOS.find(([re]) => re.test(name))?.[1] ?? KINDS.find(([re]) => re.test(name))?.[1] ?? "box";
}

export function isDataService(image: string | undefined): boolean {
  return DATA.test(imageName(image));
}

// A project shows the logo of what it serves: its primary service, else the one a domain
// points at, else the first that is not a database or queue, else whatever it runs.
export function leadService(deployment: Pick<Deployment, "services">): Service | undefined {
  const services: Service[] = deployment.services ?? [];
  return (
    services.find((s) => s.is_primary) ??
    services.find((s) => s.domains?.length) ??
    services.find((s) => !isDataService(s.image)) ??
    services[0]
  );
}

export function projectIcon(deployment: Pick<Deployment, "services">): string {
  return serviceIcon(leadService(deployment)?.image);
}
