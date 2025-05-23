import { Visualizer } from "./Visualizer.js";

export class CanvasVisualizer extends Visualizer {
  constructor(canvas, ctx, width, height) {
    super(canvas, ctx, width, height);
    this.clubs = [];
    this.people = [];
    this.clubPositions = new Map(); // Store club coordinates
    this.personPositions = new Map(); // Store person positions for each club
  }

  initialize(clubs, people) {
    this.clubs = clubs;
    this.people = people;
    this.clubPositions = new Map();
    this.personPositions = new Map();

    // Update canvas size first
    this.updateCanvasSize();

    // Calculate optimal grid layout
    const aspectRatio = this.width / this.height;
    const totalClubs = clubs.length;

    // Calculate optimal number of columns based on aspect ratio
    let numColumns = Math.ceil(Math.sqrt(totalClubs * aspectRatio));
    let numRows = Math.ceil(totalClubs / numColumns);

    // Adjust columns if too many rows
    if (numRows > numColumns * 1.5) {
      numColumns++;
      numRows = Math.ceil(totalClubs / numColumns);
    }

    // Calculate optimal club size and padding
    const minPadding = Math.min(this.width, this.height) * 0.05;
    const maxClubWidth = (this.width - minPadding * 2) / numColumns;
    const maxClubHeight = (this.height - minPadding * 2) / numRows;

    // Set club radius based on available space
    this.clubRadius = Math.min(maxClubWidth, maxClubHeight) * 0.3;

    // Calculate actual padding to center the grid
    const horizontalPadding = (this.width - maxClubWidth * numColumns) / 2;
    const verticalPadding = (this.height - maxClubHeight * numRows) / 2;

    // Position clubs in grid
    clubs.forEach((club, i) => {
      const row = Math.floor(i / numColumns);
      const col = i % numColumns;

      this.clubPositions.set(club.id, {
        x: horizontalPadding + maxClubWidth * (0.5 + col),
        y: verticalPadding + maxClubHeight * (0.5 + row),
      });
    });

    // Initialize positions for all people for all clubs
    people.forEach((person) => {
      if (!this.personPositions.has(person.id)) {
        this.personPositions.set(person.id, new Map());
      }
      const personClubPositions = this.personPositions.get(person.id);

      clubs.forEach((club) => {
        if (!personClubPositions.has(club.id)) {
          const angle = Math.random() * Math.PI * 2;
          const minRadius = this.clubRadius * 0.1;
          const maxRadius = this.clubRadius * 0.85;
          const radius = minRadius + Math.random() * (maxRadius - minRadius);
          personClubPositions.set(club.id, { angle, radius });
        }
      });
    });

    // Ensure canvas is visible
    this.canvas.style.display = "block";
    
    // Draw initial state
    this.draw();
  }

  updateCanvasSize() {
    // Get the wrapper dimensions
    const wrapper = this.canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();

    // Set canvas size with proper DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Set the canvas dimensions accounting for DPI
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;

    // Set display size
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // Scale context and reset transform
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    // Update internal dimensions
    this.width = displayWidth;
    this.height = displayHeight;
    this.minDimension = Math.min(this.width, this.height);
  }

  draw() {
    if (!this.ctx || !this.clubs || !this.people) {
      console.error("Cannot draw: missing context or data");
      return;
    }

    // Clear the canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw each club
    this.clubs.forEach((club) => {
      try {
        this.drawClub(club);
      } catch (error) {
        console.error("Error drawing club:", club.id, error);
      }
    });

    // Update trait counts for legend
    const traitCounts = {
      R: this.people.filter((person) => person.trait === "R").length,
      B: this.people.filter((person) => person.trait === "B").length,
    };
    this.updateLegend(traitCounts);
  }

  drawClub(club) {
    const pos = this.clubPositions.get(club.id);
    if (!pos) return;

    this.ctx.save();
    // Transform to club's coordinate system
    this.ctx.translate(pos.x, pos.y);

    // Draw club circle (now centered at 0,0)
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.clubRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = this.minDimension * 0.002;
    this.ctx.fillStyle = "white";
    this.ctx.fill();
    this.ctx.stroke();

    // Draw stats bar and labels - position everything above the circle with proper spacing
    const barWidth = this.clubRadius * 0.75;
    const barHeight = this.clubRadius * 0.2; // Reduced height
    const statsSpacing = this.clubRadius * 0.3; // Space between elements
    const barY = -this.clubRadius - statsSpacing; // Position bar above circle with spacing

    const rCount = club.getTraitCount("R");
    const bCount = club.getTraitCount("B");
    const total = club.getMemberCount();

    this.drawClubStats(
      0, // x is now relative to club center
      barY,
      barWidth,
      barHeight,
      rCount,
      bCount,
      total,
      statsSpacing
    );

    // Draw club label below the circle
    const fontSize = Math.max(12, Math.floor(this.minDimension * 0.012));
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    this.ctx.fillText(`Club ${club.id}`, 0, this.clubRadius * 1.25);

    // Draw club members
    club.members.forEach((person) => {
      this.drawMember(club, person);
    });

    this.ctx.restore();
  }

  drawMember(club, person) {
    const personPositions = this.personPositions.get(person.id);
    if (!personPositions) return;

    const personPos = personPositions.get(club.id);
    if (!personPos) return;

    const x = Math.cos(personPos.angle) * personPos.radius;
    const y = Math.sin(personPos.angle) * personPos.radius;

    // Draw person dot
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.minDimension * 0.008, 0, Math.PI * 2);
    this.ctx.fillStyle = person.trait === "R" ? "#e91e63" : "#2196f3";
    this.ctx.fill();
    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = this.minDimension * 0.001;
    this.ctx.stroke();
  }

  drawClubStats(x, y, barWidth, barHeight, rCount, bCount, total, spacing) {
    const barX = x - barWidth / 2;

    // Draw ratio and member count above the bar with proper spacing
    const ratio = total > 0 ? (rCount / bCount).toFixed(2) : "N/A";
    this.drawInfoLabel(`R/B: ${ratio}`, x, y - spacing * 1.2, barHeight);
    this.drawInfoLabel(`Members: ${total}`, x, y - spacing * 0.6, barHeight);

    // Background bar
    this.ctx.fillStyle = "#f0f0f0";
    this.ctx.fillRect(barX, y, barWidth, barHeight);

    // Trait bars
    if (total > 0) {
      this.ctx.fillStyle = "#e91e63";
      const rWidth = (rCount / total) * barWidth;
      this.ctx.fillRect(barX, y, rWidth, barHeight);

      this.ctx.fillStyle = "#2196f3";
      const bWidth = (bCount / total) * barWidth;
      this.ctx.fillRect(barX + rWidth, y, bWidth, barHeight);
    }

    const padding = this.minDimension * 0.005;
    const countHeight = this.minDimension * 0.015;

    // Draw counts and labels
    this.drawCountLabel(
      rCount,
      barX - padding,
      y,
      countHeight,
      "#e91e63",
      "right"
    );
    this.drawCountLabel(
      bCount,
      barX + barWidth + padding,
      y,
      countHeight,
      "#2196f3",
      "left"
    );
  }

  drawPerson(person) {
    console.log("Drawing person:", person);
    const personPositions = this.personPositions.get(person.id);
    console.log("Person positions:", personPositions);
    if (!personPositions) return;

    person.clubs.forEach((club) => {
      const clubPos = this.clubPositions.get(club.id);
      const personPos = personPositions.get(club.id);
      console.log(
        "Club position:",
        clubPos,
        "Person position in club:",
        personPos
      );
      if (!clubPos || !personPos) return;

      const x = clubPos.x + Math.cos(personPos.angle) * personPos.radius;
      const y = clubPos.y + Math.sin(personPos.angle) * personPos.radius;

      // Draw person dot with improved visibility
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.minDimension * 0.008, 0, Math.PI * 2);
      this.ctx.fillStyle = person.trait === "R" ? "#e91e63" : "#2196f3";
      this.ctx.fill();
      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = this.minDimension * 0.001;
      this.ctx.stroke();
    });
  }

  drawCountLabel(count, x, y, height, color, align) {
    const text = count.toString();
    const metrics = this.ctx.measureText(text);
    const padding = height * 0.3;

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    const bgX = align === "right" ? x - metrics.width - padding * 2 : x;
    this.ctx.fillRect(
      bgX,
      y + height / 2 - height / 2,
      metrics.width + padding * 2,
      height
    );

    this.ctx.textAlign = align;
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y + height / 2 + height / 3);
  }

  drawInfoLabel(text, x, y, height) {
    const metrics = this.ctx.measureText(text);
    const padding = height * 0.3;

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    this.ctx.fillRect(
      x - metrics.width / 2 - padding,
      y - height / 2,
      metrics.width + padding * 2,
      height
    );

    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "black";
    this.ctx.fillText(text, x, y + height / 3);
  }
}
