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
node src/master.js
```

### Slave.js
Noeud dit "worker". Se connecte au master et execute les instructions.
Pour le lancer :
```
node src/slave.js
```

### Controller.js
Pour tester le tout. Le script se connecte au matser, charge le jeu de données "winequality.csv" sur le cluster, puis execute l'entrainement de l'isolation forest.
```
node tests/controller.js
```


### Tests

Testé sous node v16.13
Pour tout lancer :
```
npm i
node src/master.js
node src/slave;js
node tests/controller.js
```


## Facteur de réplication

Les variables d'environnement permettent de jouer sur la répartition du jeu de données par le "master".
Le paramètre USE_DATASET_REPLICATION permet de spécifier si les données doivent être stoqué sur un seul noeud ou répliqués.
Le paramètre REPLICATION_FACTOR permet de définir le pourcentage du dataset contenu sur chaque noeud.
ex: 
REPLICATION_FACTOR = 1 --> chaque noeud contient tout le dataset
REPLICATION_FACTOR = 1/3 --> chaque noeud contient 33% du jeu de données

Jouer avec ces paramètres permet de fair en sorte que tout tienne en fonction de la mémoire et du nombre de noeuds.