<p align="center">NOTE: This document is under development. Please check regularly for updates!</p>

<h1 align="center">

![MWPA](https://m-e-e-r.de/wp-content/uploads/2019/01/whale-ico.png)

MWPA

</h1>

<p align="center">Mammal watching. Processing. Analysing.</p>
<p align="center">Processing and analysing data gathered by mammal watching.</p>
<div align="center">

[![Gitter](https://badges.gitter.im/Mammals-watchig-process-analyse/Main.svg)](https://gitter.im/Mammals-watchig-process-analyse/Main?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![LGTM Alerts](https://img.shields.io/lgtm/alerts/github/stefanwerfling/mwpa)](https://lgtm.com/projects/g/stefanwerfling/mwpa)
[![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/github/stefanwerfling/mwpa)](https://lgtm.com/projects/g/stefanwerfling/mwpa)
[![License: GPL v3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Liberapay](https://img.shields.io/liberapay/patrons/StefanWerf.svg?logo=liberapay)](https://liberapay.com/StefanWerf/donate)
</div>

MWPA provides the acquisition of scientific observational data, an easy-to-use user interface for viewing, confirming and reviewing the data.
This includes the backend for data collection, the frontend and a mobile phone app for snycronization.
The recorded ones relate to mammals and their observations.
The aim is to record the observations cleanly and quickly. For this purpose, the old data is processed again and imported.
<h1 align="center">

[![collect data](https://m-e-e-r.de/wp-content/uploads/2021/01/2017-1022_Fabian-Datenaufnahme-Gomera-300x200.jpg)](https://m-e-e-r.de/)

</h1>

You can also access the dev chatroom on our [Gitter Channel](https://gitter.im/Mammals-watchig-process-analyse/Main).

## Motivation

When I started my trip with the M.e.e.r e.V. association, I got to know the scientific work on La Gomera. It was overwhelmed to get so close to the marine mammals (adventure). I recognized the value of this work. The association M.e.e.r e.V. has dedicated itself to the promotion of environmental protection, science and education, in particular the protection of the cetaceans (whales and dolphins) and their marine habitat as well as the research of the cetaceans off La Gomera (Canary Islands). Working with the people was wonderful and important. I was asked whether we could do something and because of the old software for collecting the data. After a long time passed by the pandemic, we finally got back to the topic. I would like to take on this task on a voluntary basis to the best of my ability and time. :)

<h1 align="center">

[![M.e.e.r e.V.](https://m-e-e-r.de/wp-content/uploads/2019/01/MEER-Logo.svg)](https://m-e-e-r.de/)

</h1>

## Help the project

- help the association [M.e.e.r e.V.](https://m-e-e-r.de/)
- you can program, you have ideas, then help us here, foke us and improve the code :) or write to us, we like to listen.
- how can you still help? 
  - [Buy us a coffee](https://www.buymeacoffee.com/mwpa)
  - Donate (see on [M.e.e.r e.V.](https://m-e-e-r.de/) page)
  - Donate crypto coins
    - for Networks: [ETH](https://ethereum.org/en/), [BSC](https://www.binance.com/en), [Polygon](https://polygon.technology/): ```0x0bF915d5fbD65e42bd2DeD3d056752938F7174a7```

## About MWPA
MWPA is an NodeJs backend application for data collection and with frontend web application for easy-to-use. 
The backend will exchange the data with the frontend via a rest-json API. The mobile app can synchronize the data via another rest-json API with the backend.

### 1. About Backend 

- User administration
- Data properties management (specifications, management, ... and much more)
- Data collection and analysis
- Export for scientific programs
- Import old data
- API management for Mobile App

#### Importer Verions

- IM2020: Import file 2020 is a prepared file with fixed columns. The import can only be carried out once with this file.

#### Commandline arguments
See the example for starting the express server.

```--config```
  
  - Path to config file

```--import```
  
  - Path to IM2020 import file

#### Dependencies

- [NodeJS](https://nodejs.org/en/)
- [Express Server](https://expressjs.com/)
- [MariaDB](https://mariadb.org/)

#### Database documentation
> [MWPA Database documentation on dbdiagram.io](https://dbdiagram.io/d/5dfa98f1edf08a25543f3bcc)

#### API documentation
> [MWPA API documentation on stoplight.io](https://swe.stoplight.io/docs/mwpa/)

### 2. About Frontend

- User login
- Adminsitration
- Lists viewing/Filtering/Data editing

#### Dependencies

- [AdminLTE](https://github.com/ColorlibHQ/AdminLTE)
- [JQuery](https://jquery.com/)
- [Bootstraps](https://getbootstrap.com/)

#### Screenshots
<table>
  <tr>
    <td> 
      <img src="doc/screenshots/login.png" alt="1" width="360px" >
    </td>
  </tr>
</table>

### 3. About Mobile App

- Collecting data (also Offline)
- Sync to backend

## Getting Started

### Install by npm

First clone and go to folder and install all package: 

> npm install

Start express server: 

> node dist/main.js --config=/opt/app/config.json

### Docker & Docker-Compose

First edit the ```config.json``` then start docker container with docker-compose:
> docker-compose up 

or as service 
> docker-compose up -d
 
The default server port is ```3000``` you can change it in ```docker-compose.yml```.
The MariaDB database is in a volume, so the image and the container can be exchanged at any time. MariaDB listen on ```127.0.0.1:3306``` use DBeaver with SSH connection and you can see or edit the database.


NOTE: I recommend setting the express server behind an nginx proxy with a lets encrypt certificate. See [Nginx Proxy Manager](https://nginxproxymanager.com/). I strongly recommend that you pay attention to the safety, do not place unnecessary entrances to the outside.

### Dev-Tools

- [PhpStorm](https://www.jetbrains.com/phpstorm/)
- [DBeaver](https://dbeaver.io/)

## Project supervisor
* Christina Sommer by [M.e.e.r e.V.](https://m-e-e-r.de/)
* Stefan Werfling by [Pegenau GmbH & Co. KG](https://www.pegenau.de/)

## License

[![License: GPL v3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
