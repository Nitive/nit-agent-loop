FROM ubuntu:24.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends squid ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY squid.conf /etc/squid/squid.conf
COPY allowed-domains.txt /etc/squid/allowed-domains.txt
COPY allowed-ips.txt /etc/squid/allowed-ips.txt
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
