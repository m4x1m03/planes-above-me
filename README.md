<div align="center">

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/readme-logo-dark.svg">
    <img src=".github/assets/readme-logo-light.svg" alt="planes above me" width="420">
  </picture>
</p>

# Planes above me

A cloud-hosted, open-source web app for identifying planes in your visual range in real time.

[![Live site](https://img.shields.io/badge/live-planes--above.com-F2A541?style=flat-square)](https://planes-above.com)
![Last commit](https://img.shields.io/github/last-commit/m4x1m03/planes-above-me?style=flat-square)
[![Data: OpenSky](https://img.shields.io/badge/data-OpenSky_Network-5FB3D9?style=flat-square)](https://opensky-network.org)
</div>

## Roadmap

- [x] Map view of planes updated every 10 seconds
- [x] Color coded plane icons based on altitude
- [x] Plane details panel with live metrics from ADS-B data
- [x] Dead reckoning using flat earth estimation for fast updates
- [x] Azimuth and elevation based on user's location using round earth calculations
- [x] Refactor for different view implementation
- [ ] Radar view
- [ ] Dome view (star-map style sky view)

## Cloud setup

The system is currently hosted on AWS, making use of what I learned in the AWS Cloud Practitioner certification.

<p align="center">
  <a href=".github/assets/aws-architecture.svg">
    <img src=".github/assets/aws-architecture.svg" alt="AWS architecture diagram for Planes above me" width="600">
  </a>
</p>


The system follows best practices such as load balancing, multi-AZ deployment, IAM security, etc. Only the RDS database is deployed in a single AZ instead of the recommended multi-AZ because of the free plan limits.

