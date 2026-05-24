<template>
  <div class="season-effect" :class="`season-effect--${season}`" aria-hidden="true">
    <span
      v-for="i in particleCount"
      :key="i"
      class="particle"
      :style="particleStyle(i)"
    />
  </div>
</template>

<script>
export default {
  name: 'SeasonEffect',
  props: {
    season: {
      type: String,
      required: true
    }
  },
  data() {
    return {}
  },
  computed: {
    particleCount() {
      return this.season === 'summer' ? 4 : 12
    }
  },
  methods: {
    particleStyle(index) {
      if (this.season === 'summer') {
        // Distribute clouds across animation cycle for natural scatter effect
        const topPercent = 12 + (index / this.particleCount) * 50 + (Math.random() - 0.5) * 10
        const duration = 38 + Math.random() * 12
        // Negative delay: phase offset (0-0.75) + random jitter (±0.15)
        // This makes clouds appear at different positions on page load
        const phase = (index / this.particleCount) + (Math.random() - 0.5) * 0.15
        const delay = -(phase * duration)
        return {
          top: `${topPercent}%`,
          left: '-80px',
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`
        }
      }
      // Spring, Autumn, Winter: falling from top
      if (this.season === 'winter') {
        // Winter snowflakes: randomized delays for scattered effect
        const randomDelay = Math.random() * 4
        const duration = 16 + Math.random() * 8
        return {
          left: `${Math.random() * 100}%`,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${duration}s`
        }
      }
      const baseDelay = (index / this.particleCount) * 2
      return {
        left: `${(index / this.particleCount) * 100 + (Math.random() - 0.5) * 20}%`,
        animationDelay: `${baseDelay}s`,
        animationDuration: `${14 + Math.random() * 6}s`
      }
    }
  }
}
</script>

<style scoped>
.season-effect {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.particle {
  position: absolute;
  will-change: transform;
}

/* Spring - Cherry Petals (粉色花瓣) */
.season-effect--spring .particle {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ffc0e0, #ffe0ef);
  border-radius: 50% 0%;
  top: -20px;
  animation: petal-fall 15s linear infinite;
  box-shadow: 0 0 4px rgba(255, 192, 224, 0.4);
}

@keyframes petal-fall {
  0% {
    transform: translateY(-20px) translateX(0) rotate(0deg);
    opacity: 0;
  }
  5% {
    opacity: 0.8;
  }
  95% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(100vh) translateX(-60px) rotate(360deg);
    opacity: 0;
  }
}

/* Summer - Clouds (白色云朵) */
.season-effect--summer .particle {
  width: 90px;
  height: 40px;
  background: #fff;
  border-radius: 40px;
  box-shadow:
    15px -22px 0 15px #fff,
    48px -32px 0 20px #fff,
    72px -18px 0 14px #fff,
    0 8px 18px rgba(255, 255, 255, 0.35);
  animation: cloud-drift 40s linear infinite;
}

@keyframes cloud-drift {
  0% {
    transform: translateX(0);
    opacity: 0;
  }
  5% {
    opacity: 0.7;
  }
  95% {
    opacity: 0.4;
  }
  100% {
    transform: translateX(calc(100vw + 200px));
    opacity: 0;
  }
}

/* Autumn - Falling Leaves (橙色/棕红落叶) */
.season-effect--autumn .particle {
  width: 24px;
  height: 24px;
  background: linear-gradient(45deg, #e85d3d, #c44810);
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  top: -20px;
  animation: leaf-fall 12s ease-in infinite;
}

@keyframes leaf-fall {
  0% {
    transform: translateY(-20px) rotate(0deg) translateX(0);
    opacity: 0;
  }
  5% {
    opacity: 0.9;
  }
  50% {
    transform: translateY(50vh) rotate(180deg) translateX(40px);
    opacity: 0.8;
  }
  95% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(100vh) rotate(360deg) translateX(-30px);
    opacity: 0;
  }
}

/* Winter - Snowflakes (白色雪花) */
.season-effect--winter .particle {
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 0;
  top: -20px;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  box-shadow:
    0 0 4px rgba(255, 255, 255, 0.5),
    0 0 8px rgba(200, 220, 255, 0.3);
  animation: snow-fall 18s ease-in infinite;
}

@keyframes snow-fall {
  0% {
    transform: translateY(-20px) translateX(0) rotateZ(0deg);
    opacity: 0;
  }
  5% {
    opacity: 0.9;
  }
  50% {
    transform: translateY(50vh) translateX(30px) rotateZ(180deg);
    opacity: 0.8;
  }
  95% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(100vh) translateX(-20px) rotateZ(360deg);
    opacity: 0;
  }
}
</style>
