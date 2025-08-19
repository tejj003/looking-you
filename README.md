# Looking at You - Interactive Eye Art Installation

## Overview

"Looking at You" is an interactive digital art installation that creates an uncanny and mesmerizing experience where dozens of eyes follow your movement in real-time. This piece explores themes of surveillance, attention, and the unsettling feeling of being watched, while simultaneously creating a playful and engaging interaction between the viewer and the artwork.

## Concept

The installation transforms any screen into a field of watchful eyes that track movement through computer vision. Each eye responds independently yet cohesively, creating an organic, lifelike behavior that blurs the line between the digital and the living. The red background evokes a sense of intensity and alertness, while the stark white eyes with black pupils create a striking visual contrast.

## Technical Features

- **Real-time Motion Tracking**: Uses color-based tracking with advanced algorithms including:
  - Weighted centroid calculation for smooth tracking
  - Motion detection for enhanced accuracy
  - Predictive tracking using velocity and acceleration
  - Adaptive search radius that expands when tracking is lost
  - Confidence-based smoothing for natural movement

- **Responsive Design**: The eye grid automatically adjusts to fill any screen size, maintaining consistent spacing and proportions

- **Interactive Color Selection**: Click on any object in the video preview to track that color

- **Visual Feedback**: 
  - Animated tracking indicators show the system's confidence
  - Video preview with tracking overlays (toggle with 'V' key)
  - Quality indicators display tracking performance

## How to Run

1. Open `mySketch.js` in a p5.js editor or web environment
2. Allow camera access when prompted
3. The system will begin tracking red objects by default
4. Click on the video preview (bottom-right corner) to select a different color to track
5. Press 'V' to hide/show the video preview

## Interaction Tips

- **For best results**: Use a brightly colored object (red, green, or blue work well) against a contrasting background
- **Smooth movements**: Move slowly for the most natural eye-following effect
- **Multiple viewers**: The system tracks the average position of all matching colors, creating interesting effects with multiple tracked objects

## Artistic Statement

In an age of omnipresent surveillance and constant digital observation, "Looking at You" inverts the typical power dynamic of watching and being watched. Here, the viewer becomes the conductor of attention, commanding the gaze of dozens of eyes through simple movement. 

The installation questions our relationship with surveillance technology while creating a moment of playful interaction. Are these eyes threatening or curious? Judgmental or simply attentive? The answer lies in the viewer's perception and their comfort with being the center of unwavering digital attention.

## Technical Requirements

- Modern web browser with webcam support
- p5.js library
- Camera/webcam access permission

## Customization

The installation can be customized by modifying:
- Background color (currently dark red `#8B0000`)
- Eye size (adjust the `spacing` calculation)
- Tracking sensitivity (modify `colorThreshold` values)
- Eye colors (change fill colors in the `eye()` function)

## Privacy Note

This installation processes video locally in your browser. No video data is transmitted or stored. The camera feed is used solely for real-time color tracking.

## Credits
- Built with p5.js (https://p5js.org/)
- Concept and implementation by Tejj

## License

This project is open source and available under the MIT License.

---

*"The eyes are the window to the soul, but what happens when dozens of digital souls gaze back at you?"*
