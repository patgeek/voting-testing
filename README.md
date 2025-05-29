# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
#  Voting Smart Contract - Documentation des Tests

Ce projet contient une suite de tests unitaires visant à valider le bon fonctionnement du contrat intelligent **Voting.sol**. Les tests sont écrits en **JavaScript** à l’aide de **Hardhat**, **Chai**, et **Ethers.js**.

---

##  Installation et Pré-requis

### Prérequis

- Node.js >= 16
- npm ou yarn

### Installation du projet

npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

Cela installera :
Hardhat (outil de développement Ethereum)
Ethers.js (interaction avec les smart contracts)
Chai (framework d’assertions)
Mocha (framework de tests)
Hardhat toolbox (plugins utiles)


Initialisation  du projet
npx hardhat

Choisir "Create a JavaScript project".


P####  our exécuter tous les tests #######################

npx hardhat test

Pour vérifier la couverture de tests avec yarn:

Installation de solidity-coverage:
yarn add --dev solidity-coverage


Ajout du plugin dans hardhat.config.js
require("solidity-coverage");

Lancer la couverture des tests:
yarn run hardhat coverage

Cela va générer un rapport de couverture dans un dossier coverage/, avec un fichier HTML coverage/index.html



Structure recommandée du Projet:
contracts/
  Voting.sol
test/
  voting-test.js
hardhat.config.js

#######  Tests unitaires détaillés ###########################################


describe("Deployment")
Objectif : Vérifier que le déploiement du contrat est correct.

it("Le owner du contrat est correct")
 Vérifie que l'adresse owner du contrat est bien celle du déployeur (premier compte fourni par ethers.getSigners()).

################################################################################

describe("Voter Registration")
Objectif : Tester l’enregistrement d’un votant.

it("Should register voters and emit event")
 Vérifie qu’un votant peut être enregistré et que l’événement VoterRegistered est bien émis.
 Valide aussi que le statut isRegistered du votant est bien à true.

#####################################################################

describe("addVoter verification")
Objectif : Tester les conditions d'erreur liées à addVoter.

it("revert si un non-owner appelle addVoter")
 Seul le owner peut appeler addVoter. Teste une tentative par un autre utilisateur et attend un rejet personnalisé (OwnableUnauthorizedAccount).

it("Should revert addVoter if workflowStatus is not RegisteringVoters")
 Empêche d’ajouter des votants lorsque le statut du workflow est passé à une autre étape.

it("revert si voter déjà registered")
 Vérifie que l’on ne peut pas enregistrer deux fois le même votant.

#########################################################################"""

describe("Proposal Workflow")
Objectif : Tester l’enregistrement de propositions.

#############################""

it("Should allow registered voter to add proposal")
 Seuls les votants enregistrés peuvent ajouter une proposition.
 Vérifie également l’émission de l’événement ProposalRegistered.

 ########################

it("Should reject empty proposals")
 Empêche d'ajouter une proposition vide (chaîne vide). Le contrat doit renvoyer une erreur.

 ########################"

 it("Should revert addProposal if not in proposals registration phase", async function () {
            await voting.addVoter(voter1.address);

            await expect(voting.connect(voter1).addProposal("X"))
                .to.be.revertedWith("Proposals are not allowed yet");
        });

Ce test s’assure que l’accès à la fonction addProposal() est strictement limité à  la phase ProposalsRegistrationStarted

###################

  it("Should handle proposal with index 0", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            const proposal = await voting.connect(voter1).getOneProposal(0);
            expect(proposal.description).to.be.a("string"); // souvent ""
        });

On vérifie que la description de la proposition à l'index 0est bien une chaîne de caractères, ce qui confirme qu’elle a été correctement initialisée.

#####################################################

describe("Vote Process")
Objectif : Vérifier qu’un votant peut voter correctement.

it("permet à un votant enregistré de voter")
Simule tout le processus depuis l’enregistrement d’un votant jusqu’au vote :

Ajout du votant

Ajout d’une proposition

Démarrage et fin de la session de propositions

Démarrage de la session de vote

Le votant vote
 Vérifie que :
-L’événement Voted est émis
-Le votant est bien marqué comme ayant voté
-Un second vote est interdit

########################################################

describe("Workflow Transitions and Tallying")
Objectif : Tester les transitions d’état et le décompte des votes.

it("Should tally votes and declare winner")
 Simule un vote à deux personnes, comptabilise les votes et vérifie que winningProposalID() renvoie la bonne proposition.

it("Should revert tally if not in correct phase")
 On ne peut pas lancer tallyVotes() si la session de vote n’est pas terminée.

it("Should revert if non-owner tries to change workflow")
 Vérifie que seules les fonctions d’état (startProposalsRegistering, etc.) sont accessibles au owner.

###############################################################

describe("Workflow Status transitions")

Ce bloc teste les changements d'état du workflow pour s'assurer qu'ils suivent l'ordre attendu et ne peuvent pas être appelés dans le mauvais ordre

 
it("Should not start proposals if already started")
But : s’assurer qu’on ne peut pas démarrer deux fois l’enregistrement des propositions.

Attendu : la 2e tentative de startProposalsRegistering() échoue avec un message d'erreur personnalisé.


#####################

it("Should not end proposals before starting")
But : vérifier que l'on ne peut pas terminer l'enregistrement des propositions avant de l’avoir commencé

Attendu : rejet avec le message "Registering proposals havent started yet".

#################

it("Should not start voting before proposals ended")
But : empêcher de démarrer la session de vote avant la fin de l’enregistrement des propositions.

Attendu : rejet avec "Registering proposals phase is not finished".


########################

it("Should not end voting if it hasn't started")
But : tester que endVotingSession() ne peut pas être appelé trop tôt.

Attendu : rejet avec "Voting session havent started yet".


############################

it("Should not tally votes before end of voting session")
But : empêcher de comptabiliser les votes tant que la session de vote n’est pas terminée.

Attendu : rejet avec "Current status is not voting session ended".

#############################################

 describe("Getter protections")
Ce bloc assure la sécurité des fonctions publiques getVoter et getOneProposal : seules les personnes enregistrées doivent pouvoir y accéder.

########################

it("Should revert getVoter if caller is not registered")
But : vérifier qu’un utilisateur non inscrit ne peut pas obtenir les infos d’un électeur.

Attendu : rejet avec "You are not a voter".

#############################

it("Should revert getOneProposal if caller is not registered")
But : vérifier qu’un non-inscrit ne peut pas consulter une proposition.

Attendu : rejet avec "You are not a voter".

it("Should revert getOneProposal if index doesn't exist")
But : vérifier que le contrat rejette une demande pour une proposition inexistante.

Attendu : rejet silencieux ou erreur Solidity (dépend du require() utilisé dans le contrat).


########## Couverture des tests unitaires ###############################

Test de couverture des tests unitaires avec la commande:

yarn run hardhat coverage

Le résultat de la couverture des tests unitaires devrait donner:

 100% Stmts : Toutes les instructions (statements) du code ont été exécutées au moins une fois pendant les tests

85.42% Branch:Environ 85% des branches conditionnelles (if, else, switch) ont été couvertes. 
 15% des cas conditionnels ne sont pas entièrement vérifiés.

 100% % Funcs: Toutes les fonctions définies dans le contrat ont été appelées dans les tests

 100% % Lines:  Chaque ligne de code a été exécutée au moins une fois






######################################

Technologies utilisées
Hardhat : Environnement de développement Ethereum

ethers.js : Librairie pour interagir avec les contrats

chai : Librairie d’assertions pour tests

mocha : Framework de test JS

