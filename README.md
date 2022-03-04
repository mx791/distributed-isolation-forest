# distributed-isolation-forest

Implementation de l'Isolation Forest et Extended IF avec Node JS pour un fonctionnement distribué.

## Node JS
Framework back-end pour Javascript. Basé sur le V8 engine, il affiche de bonnes performances, et permet le temps réel grace aux WebSockets.

Pour installer les dependeances du projet, il vous faudra Node JS et NPM
Il faudra ensuite lancer l'installation dui projet avec la commande :
```
npm install
```


## Le cluster
Trois scripts sont disponnibles :

### Master.js
Noeud qui permet de créer le cluster.
Pour le lancer :
```
node master.js
```

### Slave.js
Noeud dit "worker". Se connecte au master et execute les instructions.
Pour le lancer :
```
node slave.js
```

### Controller.js
Pour tester le tout. Le script se connecte au matser, charge le jeu de données "winequality.csv" sur le cluster, puis execute l'entrainement de l'isolation forest.
```
node controller.js
```


### Tests

Testé sous node v16.13
Pour tout lancer :
```
npm i
node master.js
node slave;js
node controller.js
```