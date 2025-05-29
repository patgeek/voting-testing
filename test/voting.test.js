const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {


    async function deployVotingFixture() {
        const [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

        const Voting = await ethers.getContractFactory("Voting");
        const voting = await Voting.deploy();

        return { voting, owner, voter1, voter2, voter3, nonVoter };
    };

    beforeEach(async function () {
        ({ voting, owner, voter1, voter2, voter3, nonVoter } = await loadFixture(deployVotingFixture));
    });


    describe("Deployment", function () {
        it("Le owner du contrat est correct", async function () {

            expect(await voting.owner()).to.equal(owner.address);
        });
    });


    describe("Voter Registration", function () {
        it("Should register voters and emit event", async function () {


            await expect(voting.addVoter(voter1.address))
                .to.emit(voting, "VoterRegistered")
                .withArgs(voter1.address);

            const voter = await voting.connect(voter1).getVoter(voter1.address);
            expect(voter.isRegistered).to.be.true;
        });

    });

    describe("addVoter verification", function () {
        it("revert si un non-owner appelle addVoter", async function () {


            await expect(
                voting.connect(voter1).addVoter(voter2.address)
            ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                .withArgs(voter1.address);
        });


        it("Should revert addVoter if workflowStatus is not RegisteringVoters", async function () {


            await voting.startProposalsRegistering();

            await expect(voting.addVoter(voter1.address))
                .to.be.revertedWith("Voters registration is not open yet");
        });



        it("revert si voter  déjà registered", async function () {

            await voting.addVoter(voter1.address);
            await expect(voting.addVoter(voter1.address)).to.be.revertedWith("Already registered");
        });

    });

    describe("Proposal Workflow", function () {
        async function setupVoterWithProposal() {

            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            return { voting, voter1 };
        }

        it("Should allow registered voter to add proposal", async function () {
            const { voting, voter1 } = await setupVoterWithProposal();

            await expect(voting.connect(voter1).addProposal("Proposal 1"))
                .to.emit(voting, "ProposalRegistered")
                .withArgs(1);

            const proposal = await voting.connect(voter1).getOneProposal(1);
            expect(proposal.description).to.equal("Proposal 1");
        });


        it("Should revert addProposal if not in proposals registration phase", async function () {
            await voting.addVoter(voter1.address);

            await expect(voting.connect(voter1).addProposal("X"))
                .to.be.revertedWith("Proposals are not allowed yet");
        });


        it("Should handle proposal with index 0", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            const proposal = await voting.connect(voter1).getOneProposal(0);
            expect(proposal.description).to.be.a("string"); // souvent ""
        });


        it("Should reject empty proposals", async function () {
            const { voting, voter1 } = await setupVoterWithProposal();
            await expect(voting.connect(voter1).addProposal("")).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
        });
    });


    describe(" Vote Process", function () {


        it("permet à un votant enregistré de voter", async function () {
            // Étape 1 : Le owner enregistre un votant, 
            // par défaut c'est le account 0 (le owner) qui appelle
            //addVoter si on ne précise pas voting.connect(voter1).addVoter(voter1.address);
            await voting.addVoter(voter1.address);

            // Étape 2 : Le owner démarre l'enregistrement des propositions
            await voting.startProposalsRegistering();

            // Étape 3 : Le votant ajoute une proposition
            await voting.connect(voter1).addProposal("Ma proposition");

            // Étape 4 : Le owner termine l'enregistrement des propositions
            await voting.endProposalsRegistering();

            // Étape 5 : Le owner démarre la session
            // n de vote 
            await voting.startVotingSession();

            // Étape 6 : Le votant vote pour la proposition 1
            await expect(voting.connect(voter1).setVote(1))
                .to.emit(voting, "Voted")
                .withArgs(voter1.address, 1);

        });



        it("Should revert setVote if not in voting session", async function () {
            await voting.addVoter(voter1.address);
            await expect(voting.connect(voter1).setVote(1))
                .to.be.revertedWith("Voting session havent started yet");
        });



        it("marque correctement un votant comme ayant voté et empêche un second vote", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("Ma proposition");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.connect(voter1).setVote(1);

            // Vérification : le votant est marqué comme ayant voté
            const voterData = await voting.connect(voter1).getVoter(voter1.address);
            expect(voterData.hasVoted).to.be.true;
            expect(voterData.votedProposalId).to.equal(1);

            // Tentative de second vote (devrait échouer)
            await expect(voting.connect(voter1).setVote(1)).to.be.revertedWith("You have already voted");
        });




    });//fin describe vote process


    describe("Workflow Transitions and Tallying", function () {
        async function setupAndVote() {


            await voting.addVoter(voter1.address);
            await voting.addVoter(voter2.address);

            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("X");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();

            await voting.connect(voter1).setVote(1);
            await voting.connect(voter2).setVote(1);

            await voting.endVotingSession();

            return { voting, voter1, voter2 };
        }



        it("Should tally votes and declare winner", async function () {
            const { voting } = await setupAndVote();

            await expect(voting.tallyVotes())
                .to.emit(voting, "WorkflowStatusChange")
                .withArgs(4, 5);

            expect(await voting.winningProposalID()).to.equal(1);
            //toute varible d'état est accessible par défaut via une fonction du même nom: ici  winningProposalID()
            //permet d'accéder par défaut à la variable d'état winningProposalID
            //on va supposer que la proposition 1 a reçu le plus de votes 
        });


        it("Should revert tally if not in correct phase", async function () {

            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");

            //provoque une simulation de la condition 
            // require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Current status is not voting session ended");
        });



        it("Should revert if non-owner tries to change workflow", async function () {

            await voting.addVoter(voter1.address);
            await expect(voting.connect(voter1).startProposalsRegistering())
                .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
                .withArgs(voter1.address);
        });


    });


    describe("Workflow Status transitions", function () {
        it("Should not start proposals if already started", async function () {
            await voting.startProposalsRegistering();
            await expect(voting.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now");
        });

        it("Should not end proposals before starting", async function () {
            await expect(voting.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet");
        });

        it("Should not start voting before proposals ended", async function () {
            await voting.startProposalsRegistering();
            await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished");
        });

        it("Should not end voting if it hasn't started", async function () {
            await expect(voting.endVotingSession()).to.be.revertedWith("Voting session havent started yet");
        });

        it("Should not tally votes before end of voting session", async function () {
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
        });
    });



    describe("Getter protections", function () {
        it("Should revert getVoter if caller is not registered", async function () {
            await expect(voting.connect(nonVoter).getVoter(voter1.address))
                .to.be.revertedWith("You are not a voter");
        });

        it("Should revert getOneProposal if caller is not registered", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("My proposal");

            await expect(voting.connect(nonVoter).getOneProposal(1))
                .to.be.revertedWith("You are not a voter");
        });

        it("Should revert getOneProposal if index doesn't exist", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            await expect(voting.connect(voter1).getOneProposal(99)).to.be.reverted;
        });
    });







});


